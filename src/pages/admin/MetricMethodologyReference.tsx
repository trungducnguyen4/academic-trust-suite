import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function MetricMethodologyReference() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Academic Metric Methodology Reference</CardTitle>
            <p className="text-muted-foreground mt-2">
              Definitions, formulas, and methodologies for key metrics to ensure
              scientific and transparent academic evaluation.
            </p>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">
                1. Difficulty Index
              </h2>
              <p>
                <b>Definition:</b> The proportion of students who answer a
                question correctly.
                <br />
                <b>Formula:</b>{" "}
                <span className="font-mono">
                  Difficulty = (Number of students answering correctly) / (Total
                  number of students)
                </span>
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">
                2. Discrimination Index
              </h2>
              <p>
                <b>Definition:</b> Measures how well an item distinguishes
                high-performing and low-performing students.
                <br />
                <b>Formula:</b>{" "}
                <span className="font-mono">
                  Discrimination = (Correct rate of top group) - (Correct rate
                  of bottom group)
                </span>
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">3. Reliability</h2>
              <p>
                <b>Definition:</b> The consistency of assessment results across
                repeated measurements.
                <br />
                <b>Method:</b>{" "}
                <span className="font-mono">
                  Cronbach's Alpha, Split-half Reliability
                </span>
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">4. Integrity Score</h2>
              <p>
                <b>Definition:</b> A composite metric based on behavior, timing,
                answer patterns, and AI signals.
                <br />
                <b>Method:</b>{" "}
                <span className="font-mono">
                  Combined indicators: Similarity, Timing, Behavior, Pattern
                </span>
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">5. Score Breakdown</h2>
              <p>
                <b>Definition:</b> Detailed analysis of score distribution by
                section and competency.
                <br />
                <b>Formula:</b>{" "}
                <span className="font-mono">
                  Score Breakdown = Section score / Total score
                </span>
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">
                6. Event Timeline Visualization
              </h2>
              <p>
                <b>Definition:</b> Captures and visualizes behavior and events
                during exam sessions.
                <br />
                <b>Method:</b> Event logging, AI analysis, and time-based visual
                rendering.
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">
                7. AI Cheating Indicator
              </h2>
              <p>
                <b>Definition:</b> AI-driven warning metric for potential
                cheating risk.
                <br />
                <b>Method:</b> Analyze answer patterns, timing, anomalies, and
                external-source signals.
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">
                8. Statistical Summary
              </h2>
              <p>
                <b>Definition:</b> Consolidated statistical indicators across
                exams, questions, and learners.
                <br />
                <b>Method:</b> Use metrics such as Mean, Median, Standard
                Deviation, and Percentiles.
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">
                9. Academic Autonomy
              </h2>
              <p>
                <b>Definition:</b> Ensures institutions can configure, validate,
                and govern the system independently.
                <br />
                <b>Method:</b> Provide configurable metrics, thresholds, rules,
                and institution-specific reports.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
