"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarVisualizer, type AgentState } from "@/components/ui/bar-visualizer";

export default function HeroVisualizer() {
  const [state, setState] = useState<AgentState>("connecting");
  const [text, setText] = useState("Connecting to LiveKit...");

  useEffect(() => {
    let currentPhase = 0;
    const phases: { state: AgentState; text: string; duration: number }[] = [
      { state: "connecting", text: "Connecting to agent...", duration: 2500 },
      { state: "listening", text: 'Listening...', duration: 3500 },
      { state: "thinking", text: "Thinking...", duration: 3000 },
      { state: "speaking", text: "Agent speaking...", duration: 5000 },
    ];

    let timeout: NodeJS.Timeout;

    const runPhase = () => {
      const phase = phases[currentPhase];
      setState(phase.state);
      setText(phase.text);

      timeout = setTimeout(() => {
        currentPhase = (currentPhase + 1) % phases.length;
        runPhase();
      }, phase.duration);
    };

    runPhase();

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="relative w-full aspect-[4/3] flex flex-col items-center justify-center p-8 group">
      {/* Background ambient glow matching the accent color */}
      <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors duration-700 blur-[100px] -z-10 rounded-full" />
      
      {/* Grid pattern overlay (optional tech feel) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)] -z-10" />

      {/* Main Visualizer Container */}
      <div className="w-full flex-1 flex items-center justify-center max-h-[220px]">
        <BarVisualizer 
          state={state} 
          barCount={31} 
          demo={true} 
          centerAlign={true}
          className="bg-transparent h-full !p-0"
        />
      </div>

      {/* Status Text Area */}
      <div className="h-16 mt-8 flex items-center justify-center text-center w-full">
        <AnimatePresence mode="wait">
          <motion.p 
            key={text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`font-mono text-sm ${
              state === "speaking" || state === "thinking" 
                ? "text-primary glow-text font-medium" 
                : "text-muted-foreground"
            }`}
          >
            {text}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* State indicator dots */}
      <div className="absolute top-2 left-4 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${state === "connecting" ? "bg-yellow-500 shadow-[0_0_8px_#EAB308]" : "bg-border"}`} />
        <div className={`w-2 h-2 rounded-full ${state === "listening" ? "bg-green-500 shadow-[0_0_8px_#22C55E]" : "bg-border"}`} />
        <div className={`w-2 h-2 rounded-full ${state === "thinking" ? "bg-purple-500 shadow-[0_0_8px_#A855F7]" : "bg-border"}`} />
        <div className={`w-2 h-2 rounded-full ${state === "speaking" ? "bg-primary shadow-[0_0_8px_hsl(var(--accent-glow))]" : "bg-border"}`} />
      </div>
    </div>
  );
}
