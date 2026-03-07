import { useEffect, useState } from "react";
import { Cpu, Wrench, Mic, Activity } from "lucide-react";
import { Matrix } from "@/components/ui/matrix";
import FadeIn from "./FadeIn";

const MockExtensionUI = () => {
  const [activeLogIndex, setActiveLogIndex] = useState(0);
  const [vuLevels, setVuLevels] = useState(Array(10).fill(0));

  const logs = [
    { type: "user", text: "Voice activity detected", time: "10:42:01" },
    { type: "agent", text: "VoiceAgent active: transcribing...", time: "10:42:02" },
    { type: "flow", text: "Routing to PlannerAgent", time: "10:42:03" },
    { type: "tool", text: "Tool call: search_database()", time: "10:42:04" },
    { type: "agent", text: "PlannerAgent synthesizing", time: "10:42:05" },
    { type: "agent", text: "VoiceAgent responding", time: "10:42:06" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLogIndex((prev) => (prev + 1) % logs.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [logs.length]);

  useEffect(() => {
    let animationId: ReturnType<typeof setTimeout>;
    const updateVu = () => {
      const isVoiceActive = activeLogIndex === 1 || activeLogIndex === 5 || activeLogIndex === 0;
      setVuLevels((prev) =>
        prev.map(() =>
          isVoiceActive ? Math.random() * 0.8 + 0.2 : Math.random() * 0.2
        )
      );
      animationId = setTimeout(updateVu, 100);
    };
    updateVu();
    return () => clearTimeout(animationId);
  }, [activeLogIndex]);

  return (
    <div className="w-full bg-secondary rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col font-mono text-xs">
      {/* Header */}
      <div className="h-10 bg-surface border-b border-border-subtle flex items-center px-4 gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
        </div>
        <div className="mx-auto text-dim-foreground flex items-center gap-2">
          <Activity size={12} className="text-primary" /> Liveflow Monitor
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-[350px]">
        {/* Sidebar */}
        <div className="w-52 border-r border-border-subtle p-4 flex flex-col gap-6 bg-secondary">
          <div>
            <div className="text-dim-foreground mb-3 uppercase tracking-wider text-[10px]">Active Agents</div>
            <div className="space-y-2">
              <div
                className={`flex items-center gap-2 p-2 rounded transition-all duration-300 ${
                  activeLogIndex === 1 || activeLogIndex === 5
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeLogIndex === 1 || activeLogIndex === 5
                      ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                      : "bg-border"
                  }`}
                />
                VoiceAgent
              </div>
              <div
                className={`flex items-center gap-2 p-2 rounded transition-all duration-300 ${
                  activeLogIndex === 2 || activeLogIndex === 4
                    ? "bg-[#A855F7]/10 text-[#A855F7]"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeLogIndex === 2 || activeLogIndex === 4
                      ? "bg-[#A855F7] shadow-[0_0_8px_#A855F7]"
                      : "bg-border"
                  }`}
                />
                PlannerAgent
              </div>
            </div>
          </div>
          <div>
            <div className="text-dim-foreground mb-3 uppercase tracking-wider text-[10px]">Tools</div>
            <div
              className={`flex items-center gap-2 p-2 rounded transition-all duration-300 ${
                activeLogIndex === 3
                  ? "bg-[#10B981]/10 text-[#10B981]"
                  : "text-muted-foreground"
              }`}
            >
              <Wrench size={12} /> db_search
            </div>
          </div>

          {/* Matrix Voice Activity */}
          <div className="mt-auto">
            <div className="text-dim-foreground mb-3 uppercase tracking-wider text-[10px] flex items-center gap-2">
              <Mic
                size={10}
                className={
                  activeLogIndex === 1 || activeLogIndex === 5 ? "text-primary" : ""
                }
              />
              Mic / Audio
            </div>
            <div className="flex justify-center p-3 bg-surface rounded-lg border border-border-subtle">
              <Matrix
                rows={7}
                cols={12}
                mode="vu"
                levels={vuLevels}
                size={3}
                gap={2}
                palette={{ on: "#22D3EE", off: "#27272A" }}
              />
            </div>
          </div>
        </div>

        {/* Main Log Area */}
        <div className="flex-1 p-4 bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="relative z-10 flex flex-col gap-2 pt-2">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`flex gap-4 p-2.5 rounded transition-all duration-700 ease-out ${
                  i === activeLogIndex
                    ? "opacity-100 bg-surface-subtle border-l-2 border-primary scale-100"
                    : i < activeLogIndex
                    ? "opacity-40 border-l-2 border-transparent scale-[0.98]"
                    : "opacity-0 translate-y-4 border-l-2 border-transparent"
                }`}
              >
                <span className="text-dim-foreground w-16">{log.time}</span>
                <span
                  className={
                    log.type === "tool"
                      ? "text-[#10B981]"
                      : log.type === "agent"
                      ? "text-secondary-foreground"
                      : log.type === "flow"
                      ? "text-[#A855F7]"
                      : log.type === "user"
                      ? "text-primary"
                      : ""
                  }
                >
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LiveFlowDemo = () => {
  const features = [
    {
      title: "Active Agent Detection",
      desc: "Instantly see which agent currently holds the context and is processing information.",
      icon: Cpu,
    },
    {
      title: "Tool Execution Tracing",
      desc: "Watch tools execute live, including payload inputs and returned results in real-time.",
      icon: Wrench,
    },
    {
      title: "Visual Conversation Monitoring",
      desc: "Follow the natural language flow between user, voice agent, and backend planner.",
      icon: Mic,
    },
  ];

  return (
    <section id="features" className="max-w-7xl mx-auto px-6 py-24 md:py-32">
      <div className="text-center mb-20">
        <FadeIn>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
            Watch Your Agents Think
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Stop tailing endless terminal logs. Get a Chrome DevTools-like experience for your multi-agent workflows with millisecond precision.
          </p>
        </FadeIn>
      </div>

      <div className="grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5 space-y-10">
          {features.map((feature, idx) => (
            <FadeIn key={idx} delay={idx * 150}>
              <div className="group flex gap-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center group-hover:border-primary group-hover:bg-primary/10 transition-all duration-300">
                  <feature.icon className="w-5 h-5 text-dim-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <div className="lg:col-span-7">
          <FadeIn delay={300}>
            <MockExtensionUI />
          </FadeIn>
        </div>
      </div>
    </section>
  );
};

export default LiveFlowDemo;
