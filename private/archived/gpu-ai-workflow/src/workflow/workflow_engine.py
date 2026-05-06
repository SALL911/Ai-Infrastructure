"""
工作流程引擎
負責 AI 任務的排程、執行和監控
"""

import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Callable, Optional, Union
from dataclasses import dataclass, field
from enum import Enum
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from queue import Queue, PriorityQueue
import time

logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    """任務狀態枚舉"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class WorkflowStatus(Enum):
    """工作流程狀態枚舉"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class Task:
    """任務資料類"""
    task_id: str
    name: str
    func: Callable
    args: tuple = field(default_factory=tuple)
    kwargs: dict = field(default_factory=dict)
    priority: int = 0
    max_retries: int = 3
    timeout: Optional[float] = None
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Any = None
    error: Optional[str] = None
    retry_count: int = 0
    dependencies: List[str] = field(default_factory=list)


@dataclass
class WorkflowStep:
    """工作流程步驟"""
    step_id: str
    name: str
    task_func: Callable
    args: tuple = field(default_factory=tuple)
    kwargs: dict = field(default_factory=dict)
    depends_on: List[str] = field(default_factory=list)
    condition: Optional[Callable] = None
    timeout: Optional[float] = None


@dataclass
class Workflow:
    """工作流程資料類"""
    workflow_id: str
    name: str
    steps: List[WorkflowStep]
    status: WorkflowStatus = WorkflowStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    current_step: int = 0
    results: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


class TaskScheduler:
    """任務排程器"""
    
    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.task_queue = PriorityQueue()
        self.running_tasks: Dict[str, Task] = {}
        self.completed_tasks: Dict[str, Task] = {}
        self.task_dependencies: Dict[str, List[str]] = {}
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.scheduler_active = False
        self._lock = threading.Lock()
        self._scheduler_thread = None
    
    def start_scheduler(self):
        """啟動排程器"""
        if self.scheduler_active:
            return
        
        self.scheduler_active = True
        self._scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self._scheduler_thread.start()
        logger.info("任務排程器已啟動")
    
    def stop_scheduler(self):
        """停止排程器"""
        self.scheduler_active = False
        if self._scheduler_thread:
            self._scheduler_thread.join()
        self.executor.shutdown(wait=True)
        logger.info("任務排程器已停止")
    
    def submit_task(self, 
                   func: Callable, 
                   name: str = None,
                   args: tuple = None,
                   kwargs: dict = None,
                   priority: int = 0,
                   max_retries: int = 3,
                   timeout: float = None,
                   dependencies: List[str] = None) -> str:
        """提交任務到排程器"""
        task_id = str(uuid.uuid4())
        
        task = Task(
            task_id=task_id,
            name=name or func.__name__,
            func=func,
            args=args or (),
            kwargs=kwargs or {},
            priority=priority,
            max_retries=max_retries,
            timeout=timeout,
            dependencies=dependencies or []
        )
        
        with self._lock:
            self.task_dependencies[task_id] = task.dependencies
            # 使用負優先級實現最大優先級堆
            self.task_queue.put((-priority, task_id, task))
        
        logger.info(f"任務 {task_id} 已提交: {task.name}")
        return task_id
    
    def _run_scheduler(self):
        """排程器主循環"""
        while self.scheduler_active:
            try:
                # 檢查是否有可執行的任務
                if not self.task_queue.empty():
                    priority, task_id, task = self.task_queue.get()
                    
                    # 檢查依賴是否完成
                    if self._check_dependencies(task):
                        self._execute_task(task)
                    else:
                        # 依賴未完成，重新放回佇列
                        self.task_queue.put((priority, task_id, task))
                
                time.sleep(0.1)  # 避免過度使用 CPU
                
            except Exception as e:
                logger.error(f"排程器錯誤: {e}")
    
    def _check_dependencies(self, task: Task) -> bool:
        """檢查任務依賴是否完成"""
        for dep_id in task.dependencies:
            if dep_id not in self.completed_tasks:
                return False
            if self.completed_tasks[dep_id].status != TaskStatus.COMPLETED:
                return False
        return True
    
    def _execute_task(self, task: Task):
        """執行任務"""
        with self._lock:
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.now()
            self.running_tasks[task.task_id] = task
        
        # 提交到線程池執行
        future = self.executor.submit(self._run_task, task)
        future.add_done_callback(lambda f: self._task_completed(task, f))
    
    def _run_task(self, task: Task) -> Any:
        """執行具體任務"""
        try:
            logger.info(f"開始執行任務: {task.name}")
            
            # 設置超時
            if task.timeout:
                future = self.executor.submit(task.func, *task.args, **task.kwargs)
                result = future.result(timeout=task.timeout)
            else:
                result = task.func(*task.args, **task.kwargs)
            
            return result
            
        except Exception as e:
            logger.error(f"任務 {task.name} 執行失敗: {e}")
            raise
    
    def _task_completed(self, task: Task, future):
        """任務完成回調"""
        try:
            # 獲取結果
            result = future.result()
            task.result = result
            task.status = TaskStatus.COMPLETED
            
            logger.info(f"任務 {task.name} 完成")
            
        except Exception as e:
            task.error = str(e)
            task.retry_count += 1
            
            if task.retry_count <= task.max_retries:
                # 重試任務
                task.status = TaskStatus.PENDING
                logger.warning(f"任務 {task.name} 失敗，重試 ({task.retry_count}/{task.max_retries})")
                self.task_queue.put((0, task.task_id, task))
                return
            else:
                task.status = TaskStatus.FAILED
                logger.error(f"任務 {task.name} 最終失敗: {e}")
        
        finally:
            task.completed_at = datetime.now()
            
            with self._lock:
                self.running_tasks.pop(task.task_id, None)
                self.completed_tasks[task.task_id] = task
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """獲取任務狀態"""
        task = None
        if task_id in self.running_tasks:
            task = self.running_tasks[task_id]
        elif task_id in self.completed_tasks:
            task = self.completed_tasks[task_id]
        
        if not task:
            return None
        
        return {
            "task_id": task.task_id,
            "name": task.name,
            "status": task.status.value,
            "priority": task.priority,
            "created_at": task.created_at.isoformat(),
            "started_at": task.started_at.isoformat() if task.started_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "retry_count": task.retry_count,
            "error": task.error,
            "dependencies": task.dependencies
        }
    
    def cancel_task(self, task_id: str) -> bool:
        """取消任務"""
        with self._lock:
            if task_id in self.running_tasks:
                task = self.running_tasks[task_id]
                task.status = TaskStatus.CANCELLED
                self.running_tasks.pop(task_id, None)
                logger.info(f"任務 {task_id} 已取消")
                return True
        
        return False
    
    def get_queue_info(self) -> Dict[str, Any]:
        """獲取佇列資訊"""
        return {
            "queue_size": self.task_queue.qsize(),
            "running_tasks": len(self.running_tasks),
            "completed_tasks": len(self.completed_tasks),
            "max_workers": self.max_workers
        }


class WorkflowEngine:
    """工作流程引擎"""
    
    def __init__(self, scheduler: TaskScheduler):
        self.scheduler = scheduler
        self.workflows: Dict[str, Workflow] = {}
        self._lock = threading.Lock()
    
    def define_workflow(self, 
                        workflow_name: str, 
                        steps: List[WorkflowStep]) -> str:
        """定義工作流程"""
        workflow_id = str(uuid.uuid4())
        
        workflow = Workflow(
            workflow_id=workflow_id,
            name=workflow_name,
            steps=steps
        )
        
        with self._lock:
            self.workflows[workflow_id] = workflow
        
        logger.info(f"工作流程 {workflow_name} 已定義: {workflow_id}")
        return workflow_id
    
    async def execute_workflow(self, workflow_id: str, input_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """執行工作流程"""
        with self._lock:
            if workflow_id not in self.workflows:
                raise ValueError(f"工作流程不存在: {workflow_id}")
            
            workflow = self.workflows[workflow_id]
            workflow.status = WorkflowStatus.RUNNING
            workflow.started_at = datetime.now()
        
        try:
            logger.info(f"開始執行工作流程: {workflow.name}")
            
            # 執行每個步驟
            for i, step in enumerate(workflow.steps):
                workflow.current_step = i
                
                # 檢查條件
                if step.condition and not step.condition(workflow.results):
                    logger.info(f"步驟 {step.name} 條件不滿足，跳過")
                    continue
                
                # 檢查依賴
                if not self._check_step_dependencies(step, workflow.results):
                    raise ValueError(f"步驟 {step.name} 依賴未滿足")
                
                # 執行步驟
                step_result = await self._execute_step(step, input_data or {})
                workflow.results[step.step_id] = step_result
                
                logger.info(f"步驟 {step.name} 完成")
            
            # 工作流程完成
            workflow.status = WorkflowStatus.COMPLETED
            workflow.completed_at = datetime.now()
            
            logger.info(f"工作流程 {workflow.name} 完成")
            return workflow.results
            
        except Exception as e:
            workflow.status = WorkflowStatus.FAILED
            workflow.error = str(e)
            workflow.completed_at = datetime.now()
            
            logger.error(f"工作流程 {workflow.name} 失敗: {e}")
            raise
    
    def _check_step_dependencies(self, step: WorkflowStep, results: Dict[str, Any]) -> bool:
        """檢查步驟依賴"""
        for dep_id in step.depends_on:
            if dep_id not in results:
                return False
        return True
    
    async def _execute_step(self, step: WorkflowStep, input_data: Dict[str, Any]) -> Any:
        """執行工作流程步驟"""
        # 合併輸入資料和工作流程結果
        kwargs = {**input_data, **self._get_dependency_results(step.depends_on)}
        kwargs.update(step.kwargs)
        
        # 提交任務到排程器
        task_id = self.scheduler.submit_task(
            func=step.task_func,
            name=step.name,
            args=step.args,
            kwargs=kwargs,
            timeout=step.timeout
        )
        
        # 等待任務完成
        while True:
            status = self.scheduler.get_task_status(task_id)
            if not status:
                raise RuntimeError(f"任務狀態獲取失敗: {task_id}")
            
            if status["status"] == TaskStatus.COMPLETED.value:
                # 獲取任務結果
                task = self.scheduler.completed_tasks.get(task_id)
                return task.result if task else None
            
            elif status["status"] == TaskStatus.FAILED.value:
                raise RuntimeError(f"步驟 {step.name} 執行失敗")
            
            await asyncio.sleep(0.1)
    
    def _get_dependency_results(self, dependencies: List[str]) -> Dict[str, Any]:
        """獲取依賴結果"""
        results = {}
        for dep_id in dependencies:
            # 從已完成任務中獲取結果
            for task in self.scheduler.completed_tasks.values():
                if task.task_id == dep_id and task.status == TaskStatus.COMPLETED:
                    results[dep_id] = task.result
                    break
        return results
    
    def monitor_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """監控工作流程執行"""
        with self._lock:
            if workflow_id not in self.workflows:
                return {"error": "工作流程不存在"}
            
            workflow = self.workflows[workflow_id]
            
            return {
                "workflow_id": workflow.workflow_id,
                "name": workflow.name,
                "status": workflow.status.value,
                "current_step": workflow.current_step,
                "total_steps": len(workflow.steps),
                "created_at": workflow.created_at.isoformat(),
                "started_at": workflow.started_at.isoformat() if workflow.started_at else None,
                "completed_at": workflow.completed_at.isoformat() if workflow.completed_at else None,
                "error": workflow.error,
                "results_count": len(workflow.results)
            }
    
    def list_workflows(self) -> List[Dict[str, Any]]:
        """列出所有工作流程"""
        with self._lock:
            return [
                {
                    "workflow_id": wf.workflow_id,
                    "name": wf.name,
                    "status": wf.status.value,
                    "steps_count": len(wf.steps),
                    "created_at": wf.created_at.isoformat()
                }
                for wf in self.workflows.values()
            ]
    
    def cancel_workflow(self, workflow_id: str) -> bool:
        """取消工作流程"""
        with self._lock:
            if workflow_id not in self.workflows:
                return False
            
            workflow = self.workflows[workflow_id]
            workflow.status = WorkflowStatus.CANCELLED
            workflow.completed_at = datetime.now()
            
            logger.info(f"工作流程 {workflow.name} 已取消")
            return True


# 全域實例
task_scheduler = TaskScheduler()
workflow_engine = WorkflowEngine(task_scheduler)
