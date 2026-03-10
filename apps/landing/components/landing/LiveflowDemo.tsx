import { Cpu, Wrench, Mic } from "lucide-react";
import Video from "next-video";
import liveflowVideo from "../../videos/liveflow.mp4";
import FadeIn from "@/components/landing/FadeIn";

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
            <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
              <Video
                src={liveflowVideo}
                className="w-full"
                style={{ aspectRatio: "16/9" }}
                autoPlay
                loop
                muted
                playsInline
              />
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
};

export default LiveFlowDemo;
