"""
規則引擎實現
基於 JSON 配置的可計算規則引擎，用於協議驗證和合規檢查
"""

import json
import re
import hashlib
import logging
from typing import Dict, List, Any, Optional, Union, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)


class RuleSeverity(Enum):
    """規則嚴重程度"""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class RuleCategory(Enum):
    """規則類別"""
    VALIDATION = "validation"
    COMPLIANCE = "compliance"
    BUSINESS_LOGIC = "business_logic"
    SECURITY = "security"
    PERFORMANCE = "performance"


class ActionType(Enum):
    """動作類型"""
    REJECT = "reject"
    WARN = "warn"
    LOG = "log"
    NOTIFY = "notify"
    TRANSFORM = "transform"
    RETRY = "retry"


class Operator(Enum):
    """比較運算符"""
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    GREATER_EQUAL = "greater_equal"
    LESS_EQUAL = "less_equal"
    CONTAINS = "contains"
    REGEX = "regex"
    EXISTS = "exists"
    NOT_EXISTS = "not_exists"


@dataclass
class RuleCondition:
    """規則條件"""
    field: str
    operator: Operator
    value: Any = None
    logical_operator: str = "and"


@dataclass
class RuleAction:
    """規則動作"""
    type: ActionType
    message: str
    parameters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Rule:
    """規則定義"""
    rule_id: str
    name: str
    category: RuleCategory
    severity: RuleSeverity
    conditions: List[RuleCondition]
    actions: List[RuleAction]
    description: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RuleExecutionResult:
    """規則執行結果"""
    rule_id: str
    passed: bool
    severity: RuleSeverity
    actions_taken: List[Dict[str, Any]]
    execution_time_ms: float
    error_message: Optional[str] = None


@dataclass
class RuleEngineResult:
    """規則引擎執行結果"""
    success: bool
    total_rules: int
    passed_rules: int
    failed_rules: int
    warning_rules: int
    results: List[RuleExecutionResult]
    execution_time_ms: float
    transformed_data: Optional[Dict[str, Any]] = None


class RuleEngine:
    """規則引擎實現"""
    
    def __init__(self, rules_config_path: str = None):
        self.rules: Dict[str, Rule] = {}
        self.rule_categories: List[RuleCategory] = []
        self.execution_mode = "conditional"
        self.max_execution_time_ms = 5000
        self.cache_enabled = True
        self.cache_ttl_seconds = 300
        self.cache: Dict[str, Any] = {}
        self.logging_enabled = True
        self.metrics_enabled = True
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        if rules_config_path:
            self.load_rules_from_config(rules_config_path)
    
    def load_rules_from_config(self, config_path: str):
        """從 JSON 配置檔案載入規則"""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # 載入規則引擎配置
            engine_config = config.get('rule_engine', {})
            self.execution_mode = engine_config.get('execution_mode', 'conditional')
            self.max_execution_time_ms = engine_config.get('max_execution_time_ms', 5000)
            self.cache_enabled = engine_config.get('cache_enabled', True)
            self.cache_ttl_seconds = engine_config.get('cache_ttl_seconds', 300)
            self.logging_enabled = engine_config.get('logging_enabled', True)
            self.metrics_enabled = engine_config.get('metrics_enabled', True)
            
            # 載入規則類別
            self.rule_categories = [
                RuleCategory(cat) for cat in config.get('rule_categories', [])
            ]
            
            # 載入規則
            rules_config = config.get('rules', {})
            self._load_brand_identity_rules(rules_config.get('brand_identity_rules', {}))
            self._load_esg_compliance_rules(rules_config.get('esg_compliance_rules', {}))
            self._load_ai_governance_rules(rules_config.get('ai_governance_rules', {}))
            self._load_verification_rules(rules_config.get('verification_rules', {}))
            self._load_gpu_acceleration_rules(rules_config.get('gpu_acceleration_rules', {}))
            
            logger.info(f"成功載入 {len(self.rules)} 條規則")
            
        except Exception as e:
            logger.error(f"載入規則配置失敗: {e}")
            raise
    
    def _load_brand_identity_rules(self, config: Dict[str, Any]):
        """載入品牌身份規則"""
        for rule_name, rule_config in config.items():
            if rule_name == 'did_validation':
                self._add_rule_from_config(rule_config)
            elif rule_name == 'credential_validation':
                self._add_rule_from_config(rule_config)
            elif rule_name == 'brand_uniqueness':
                self._add_rule_from_config(rule_config)
            elif rule_name == 'industry_classification':
                self._add_rule_from_config(rule_config)
    
    def _load_esg_compliance_rules(self, config: Dict[str, Any]):
        """載入 ESG 合規規則"""
        for rule_name, rule_config in config.items():
            if rule_name == 'carbon_reporting':
                self._add_rule_from_config(rule_config)
            elif rule_name == 'advertising_carbon':
                self._add_rule_from_config(rule_config)
            elif rule_name == 'sustainability_metrics':
                self._add_rule_from_config(rule_config)
            elif rule_name == 'reduction_target_validation':
                self._add_rule_from_config(rule_config)
    
    def _load_ai_governance_rules(self, config: Dict[str, Any]):
        """載入 AI 治理規則"""
        for rule_name, rule_config in config.items():
            if rule_name == 'decision_audit':
                self._add_rule_from_config(rule_config)
            elif rule_name == 'model_accountability':
                self._add_rule_from_config(rule_config)
            elif rule_name == 'algorithm_registry':
                self._add_rule_from_config(rule_config)
            elif rule_name == 'bias_detection':
                self._add_rule_from_config(rule_config)
    
    def _load_verification_rules(self, config: Dict[str, Any]):
        """載入驗證規則"""
        for rule_name, rule_config in config.items():
            if rule_name == 'zkp_validation':
                self._add_rule_from_config(rule_config)
            elif rule_name == 'data_integrity':
                self._add_rule_from_config(rule_config)
            elif rule_name == 'audit_trail':
                self._add_rule_from_config(rule_config)
    
    def _load_gpu_acceleration_rules(self, config: Dict[str, Any]):
        """載入 GPU 加速規則"""
        for rule_name, rule_config in config.items():
            if rule_name == 'gpu_utilization':
                self._add_rule_from_config(rule_config)
            elif rule_name == 'memory_management':
                self._add_rule_from_config(rule_config)
            elif rule_name == 'performance_optimization':
                self._add_rule_from_config(rule_config)
            elif rule_name == 'resource_allocation':
                self._add_rule_from_config(rule_config)
    
    def _add_rule_from_config(self, config: Dict[str, Any]):
        """從配置添加規則"""
        try:
            rule_id = config['rule_id']
            name = config['name']
            category = RuleCategory(config['category'])
            severity = RuleSeverity(config['severity'])
            
            # 解析條件
            conditions = []
            for cond_config in config.get('conditions', []):
                condition = RuleCondition(
                    field=cond_config['field'],
                    operator=Operator(cond_config['operator']),
                    value=cond_config.get('value'),
                    logical_operator=cond_config.get('logical_operator', 'and')
                )
                conditions.append(condition)
            
            # 解析動作
            actions = []
            for action_config in config.get('actions', []):
                action = RuleAction(
                    type=ActionType(action_config['type']),
                    message=action_config['message'],
                    parameters=action_config.get('parameters', {})
                )
                actions.append(action)
            
            rule = Rule(
                rule_id=rule_id,
                name=name,
                category=category,
                severity=severity,
                conditions=conditions,
                actions=actions,
                description=config.get('description', ''),
                metadata={k: v for k, v in config.items() 
                         if k not in ['rule_id', 'name', 'category', 'severity', 
                                    'conditions', 'actions', 'description']}
            )
            
            self.rules[rule_id] = rule
            
        except Exception as e:
            logger.error(f"載入規則失敗: {e}")
    
    def evaluate_rules(self, data: Dict[str, Any], 
                      rule_categories: List[RuleCategory] = None) -> RuleEngineResult:
        """評估規則"""
        start_time = datetime.now()
        
        # 過濾規則類別
        rules_to_evaluate = []
        if rule_categories:
            rules_to_evaluate = [
                rule for rule in self.rules.values() 
                if rule.category in rule_categories
            ]
        else:
            rules_to_evaluate = list(self.rules.values())
        
        # 檢查快取
        cache_key = self._generate_cache_key(data, rule_categories)
        if self.cache_enabled and cache_key in self.cache:
            cached_result = self.cache[cache_key]
            if self._is_cache_valid(cached_result['timestamp']):
                logger.info("使用快取的規則評估結果")
                return cached_result['result']
        
        # 執行規則評估
        results = []
        transformed_data = data.copy()
        
        for rule in rules_to_evaluate:
            result = self._evaluate_rule(rule, transformed_data)
            results.append(result)
            
            # 如果是錯誤級別且動作是拒絕，則停止評估
            if (not result.passed and 
                rule.severity == RuleSeverity.ERROR and 
                any(action.type == ActionType.REJECT for action in rule.actions)):
                break
        
        # 統計結果
        total_rules = len(results)
        passed_rules = sum(1 for r in results if r.passed)
        failed_rules = sum(1 for r in results if not r.passed and r.severity == RuleSeverity.ERROR)
        warning_rules = sum(1 for r in results if not r.passed and r.severity == RuleSeverity.WARNING)
        
        success = failed_rules == 0
        
        execution_time = (datetime.now() - start_time).total_seconds() * 1000
        
        engine_result = RuleEngineResult(
            success=success,
            total_rules=total_rules,
            passed_rules=passed_rules,
            failed_rules=failed_rules,
            warning_rules=warning_rules,
            results=results,
            execution_time_ms=execution_time,
            transformed_data=transformed_data
        )
        
        # 快取結果
        if self.cache_enabled:
            self.cache[cache_key] = {
                'result': engine_result,
                'timestamp': datetime.now()
            }
        
        # 記錄指標
        if self.metrics_enabled:
            self._record_metrics(engine_result)
        
        return engine_result
    
    def _evaluate_rule(self, rule: Rule, data: Dict[str, Any]) -> RuleExecutionResult:
        """評估單個規則"""
        start_time = datetime.now()
        
        try:
            # 評估條件
            condition_results = []
            for condition in rule.conditions:
                result = self._evaluate_condition(condition, data)
                condition_results.append(result)
            
            # 組合條件結果
            passed = self._combine_conditions(condition_results)
            
            actions_taken = []
            if not passed:
                # 執行動作
                for action in rule.actions:
                    action_result = self._execute_action(action, rule, data)
                    actions_taken.append(action_result)
            
            execution_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return RuleExecutionResult(
                rule_id=rule.rule_id,
                passed=passed,
                severity=rule.severity,
                actions_taken=actions_taken,
                execution_time_ms=execution_time
            )
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds() * 1000
            logger.error(f"規則 {rule.rule_id} 執行失敗: {e}")
            
            return RuleExecutionResult(
                rule_id=rule.rule_id,
                passed=False,
                severity=rule.severity,
                actions_taken=[],
                execution_time_ms=execution_time,
                error_message=str(e)
            )
    
    def _evaluate_condition(self, condition: RuleCondition, data: Dict[str, Any]) -> bool:
        """評估單個條件"""
        try:
            # 獲取欄位值
            field_value = self._get_field_value(data, condition.field)
            
            # 處理存在性檢查
            if condition.operator == Operator.EXISTS:
                return field_value is not None
            elif condition.operator == Operator.NOT_EXISTS:
                return field_value is None
            
            # 如果欄位不存在，條件失敗
            if field_value is None:
                return False
            
            # 執行比較
            if condition.operator == Operator.EQUALS:
                return field_value == condition.value
            elif condition.operator == Operator.NOT_EQUALS:
                return field_value != condition.value
            elif condition.operator == Operator.GREATER_THAN:
                return float(field_value) > float(condition.value)
            elif condition.operator == Operator.LESS_THAN:
                return float(field_value) < float(condition.value)
            elif condition.operator == Operator.GREATER_EQUAL:
                return float(field_value) >= float(condition.value)
            elif condition.operator == Operator.LESS_EQUAL:
                return float(field_value) <= float(condition.value)
            elif condition.operator == Operator.CONTAINS:
                return str(condition.value) in str(field_value)
            elif condition.operator == Operator.REGEX:
                return bool(re.match(str(condition.value), str(field_value)))
            
            return False
            
        except Exception as e:
            logger.error(f"條件評估失敗: {e}")
            return False
    
    def _get_field_value(self, data: Dict[str, Any], field_path: str) -> Any:
        """獲取欄位值，支援嵌套路徑"""
        keys = field_path.split('.')
        value = data
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        
        return value
    
    def _combine_conditions(self, condition_results: List[bool]) -> bool:
        """組合條件結果"""
        if not condition_results:
            return True
        
        # 簡化實現：所有條件都為 AND 關係
        return all(condition_results)
    
    def _execute_action(self, action: RuleAction, rule: Rule, data: Dict[str, Any]) -> Dict[str, Any]:
        """執行規則動作"""
        action_result = {
            'type': action.type.value,
            'message': action.message,
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            if action.type == ActionType.REJECT:
                logger.error(f"規則 {rule.rule_id} 拒絕: {action.message}")
                action_result['status'] = 'executed'
                
            elif action.type == ActionType.WARN:
                logger.warning(f"規則 {rule.rule_id} 警告: {action.message}")
                action_result['status'] = 'executed'
                
            elif action.type == ActionType.LOG:
                logger.info(f"規則 {rule.rule_id} 日誌: {action.message}")
                action_result['status'] = 'executed'
                
            elif action.type == ActionType.NOTIFY:
                # 實現通知邏輯
                self._send_notification(action.message, action.parameters)
                action_result['status'] = 'executed'
                
            elif action.type == ActionType.TRANSFORM:
                # 實現資料轉換邏輯
                transformed = self._transform_data(data, action.parameters)
                data.update(transformed)
                action_result['status'] = 'executed'
                action_result['transformed_fields'] = list(transformed.keys())
                
            elif action.type == ActionType.RETRY:
                # 實現重試邏輯
                retry_count = action.parameters.get('retry_count', 3)
                action_result['status'] = 'pending_retry'
                action_result['retry_count'] = retry_count
            
        except Exception as e:
            logger.error(f"執行動作失敗: {e}")
            action_result['status'] = 'failed'
            action_result['error'] = str(e)
        
        return action_result
    
    def _send_notification(self, message: str, parameters: Dict[str, Any]):
        """發送通知"""
        # 實現通知邏輯（郵件、Slack、Webhook 等）
        logger.info(f"發送通知: {message}")
    
    def _transform_data(self, data: Dict[str, Any], parameters: Dict[str, Any]) -> Dict[str, Any]:
        """轉換資料"""
        transformed = {}
        
        # 實現各種轉換邏輯
        for field, transformation in parameters.items():
            if transformation['type'] == 'calculate':
                # 計算欄位
                if field == 'advertising_carbon':
                    impressions = data.get('impressions', 0)
                    energy_factor = transformation.get('energy_factor', 0.000001)
                    emission_factor = transformation.get('emission_factor', 0.5)
                    carbon_kg = impressions * energy_factor * emission_factor
                    transformed[field] = carbon_kg
            
            elif transformation['type'] == 'format':
                # 格式化欄位
                value = data.get(field)
                if value is not None:
                    transformed[field] = transformation.get('format', '{}').format(value)
            
            elif transformation['type'] == 'validate':
                # 驗證欄位
                value = data.get(field)
                if value is not None:
                    # 實現驗證邏輯
                    transformed[f"{field}_valid"] = True
        
        return transformed
    
    def _generate_cache_key(self, data: Dict[str, Any], 
                          rule_categories: List[RuleCategory] = None) -> str:
        """生成快取鍵"""
        # 創建資料的雜湊值
        data_str = json.dumps(data, sort_keys=True)
        data_hash = hashlib.sha256(data_str.encode()).hexdigest()
        
        # 添加規則類別
        categories_str = ','.join([cat.value for cat in rule_categories]) if rule_categories else 'all'
        
        return f"{data_hash}:{categories_str}"
    
    def _is_cache_valid(self, timestamp: datetime) -> bool:
        """檢查快取是否有效"""
        return (datetime.now() - timestamp).total_seconds() < self.cache_ttl_seconds
    
    def _record_metrics(self, result: RuleEngineResult):
        """記錄指標"""
        # 實現指標記錄邏輯
        logger.info(f"規則評估指標: 總規則={result.total_rules}, "
                   f"通過={result.passed_rules}, 失敗={result.failed_rules}, "
                   f"警告={result.warning_rules}, 耗時={result.execution_time_ms:.2f}ms")
    
    def get_rule_by_id(self, rule_id: str) -> Optional[Rule]:
        """根據 ID 獲取規則"""
        return self.rules.get(rule_id)
    
    def get_rules_by_category(self, category: RuleCategory) -> List[Rule]:
        """根據類別獲取規則"""
        return [rule for rule in self.rules.values() if rule.category == category]
    
    def add_rule(self, rule: Rule):
        """添加規則"""
        self.rules[rule.rule_id] = rule
        logger.info(f"添加規則: {rule.rule_id}")
    
    def remove_rule(self, rule_id: str) -> bool:
        """移除規則"""
        if rule_id in self.rules:
            del self.rules[rule_id]
            logger.info(f"移除規則: {rule_id}")
            return True
        return False
    
    def clear_cache(self):
        """清除快取"""
        self.cache.clear()
        logger.info("規則引擎快取已清除")
    
    def get_statistics(self) -> Dict[str, Any]:
        """獲取規則引擎統計資訊"""
        category_stats = {}
        for category in RuleCategory:
            rules = self.get_rules_by_category(category)
            category_stats[category.value] = {
                'count': len(rules),
                'error_count': len([r for r in rules if r.severity == RuleSeverity.ERROR]),
                'warning_count': len([r for r in rules if r.severity == RuleSeverity.WARNING]),
                'info_count': len([r for r in rules if r.severity == RuleSeverity.INFO])
            }
        
        return {
            'total_rules': len(self.rules),
            'categories': category_stats,
            'cache_enabled': self.cache_enabled,
            'cache_size': len(self.cache),
            'execution_mode': self.execution_mode
        }


# 全域規則引擎實例
rule_engine = RuleEngine()
