"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";

export default function LearningFeedbackDetail() {
  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full">
          <BackToDashboardButton to="/student" className="mb-4 -ml-2" />
        </div>

        {/* Sidebar */}
        <aside className="w-full md:w-64 mb-6 md:mb-0">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Exam Feedback</CardTitle>
              <div className="text-xs text-muted-foreground">
                Midterm - Computer Science 101
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button variant="ghost" className="justify-start">
                Overview
              </Button>
              <Button variant="secondary" className="justify-start">
                Performance
              </Button>
              <Button variant="ghost" className="justify-start">
                Mistake Patterns
              </Button>
              <Button variant="ghost" className="justify-start">
                Recommendations
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-2">
                NEED HELP?
              </div>
              <Button size="sm" className="w-full">
                Book Session
              </Button>
            </CardContent>
          </Card>
        </aside>
        {/* Main Content */}
        <main className="flex-1">
          <div className="mb-4 text-xs text-muted-foreground">
            Home &gt; Exams &gt; Learning Feedback
          </div>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">Midterm Analysis</h1>
            <div className="flex gap-2">
              <Button variant="outline">Share</Button>
              <Button>Download PDF</Button>
            </div>
          </div>
          <div className="text-muted-foreground mb-6">
            Deep dive into your CS101 midterm results and cognitive patterns.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="text-3xl font-bold">84/100</div>
                <div className="text-green-600 text-xs font-semibold mt-1">
                  +5% vs Average
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Total Score
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="text-3xl font-bold">78%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Topic Mastery
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="text-3xl font-bold">45 mins</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Time Used
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Mistake Patterns</CardTitle>
              <div className="text-xs text-muted-foreground">
                Identified recurring errors across multiple questions.
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-orange-600 font-bold">!</span>
                  <span className="font-semibold">
                    Asymptotic Analysis Confusion
                  </span>
                  <span className="ml-auto bg-orange-200 text-orange-800 text-xs font-bold px-2 py-0.5 rounded">
                    HIGH IMPACT
                  </span>
                </div>
                <div className="text-sm mb-1">
                  You consistently swapped Big-O and Big-Theta notation in
                  algorithmic complexity questions (Q4, Q12, Q19).
                </div>
                <div className="text-xs">
                  Learning Objective:{" "}
                  <a href="#" className="underline text-blue-700">
                    CS-1.0-4.1: Algorithmic Efficiency
                  </a>
                </div>
              </div>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-yellow-600 font-bold">!</span>
                  <span className="font-semibold">End-of-Session Fatigue</span>
                  <span className="ml-auto bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded">
                    MODERATE IMPACT
                  </span>
                </div>
                <div className="text-sm mb-1">
                  Accuracy dropped by 30% in the final 15 minutes. Most errors
                  were simple syntax mistakes rather than conceptual.
                </div>
                <div className="text-xs">
                  Trend:{" "}
                  <span className="italic">
                    Last 10 questions took 40% less time than average.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="mb-4 font-semibold text-lg">
            Personalized Recommendations
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="font-semibold mb-1">
                  Chapter 4: Algorithmic Complexity
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  Focus on pages 142-158 regarding Theta notation definitions.
                </div>
                <Button variant="link" className="p-0 h-auto text-blue-700">
                  Read Now →
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="font-semibold mb-1">Video: Mastering Big-O</div>
                <div className="text-xs text-muted-foreground mb-2">
                  12-minute deep dive by Prof. Miller into common
                  misconceptions.
                </div>
                <Button variant="link" className="p-0 h-auto text-blue-700">
                  Watch Video →
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="font-semibold mb-1">
                  Practice Set: Notation Mastery
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  10 adaptive questions targeting your specific weak points.
                </div>
                <Button variant="link" className="p-0 h-auto text-blue-700">
                  Start Quiz →
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="font-semibold mb-1">
                  Study Group: CS101 Prep
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  Join 4 peers currently studying similar topics this week.
                </div>
                <Button variant="link" className="p-0 h-auto text-blue-700">
                  Join Group →
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}

