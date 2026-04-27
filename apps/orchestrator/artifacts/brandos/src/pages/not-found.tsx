import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">頁面不存在</h1>
          </div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            您要找的頁面不存在。
          </p>
          <div className="mt-4">
            <Link href="/" className="text-primary hover:underline text-sm">
              返回 AI 排行榜
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
