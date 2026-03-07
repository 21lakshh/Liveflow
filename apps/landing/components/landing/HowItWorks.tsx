"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Copy, Check, Puzzle } from "lucide-react";

function CommandBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-border bg-[#0a0a0a] px-4 py-2.5 font-mono text-sm">
      <span className="text-primary select-all">{command}</span>
      <button
        onClick={copy}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Copy command"
      >
        {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

const steps = [
  {
    num: "01",
    title: "Install Liveflow",
    desc: "Add the Python package to your environment.",
    command: "pip install liveflow",
  },
  {
    num: "02",
    title: "Download the VS Code Extension",
    desc: "Visualize your agent's state directly inside your editor.",
    isButton: true,
  },
  {
    num: "03",
    title: "Run Your Agent",
    desc: "Wrap your agent entrypoint with the liveflow dev runner.",
    command: "python liveflow agent.py dev",
  },
];

const HowItWorks = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} id="how-it-works" className="relative py-32 px-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <p className="text-xs font-mono text-primary uppercase tracking-widest mb-3">Setup</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Get running in three steps
          </h2>
        </motion.div>

        {/* Tree */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -16 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.45, delay: 0.12 * i }}
                className="relative pl-9"
              >
                {/* Node dot */}
                <div className="absolute left-0 top-1 w-[23px] h-[23px] rounded-full border border-primary bg-background flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>

                <div>
                  <span className="text-[11px] font-mono text-primary tracking-widest">{step.num}</span>
                  <h3 className="mt-0.5 text-base font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>

                  {step.command && <CommandBlock command={step.command} />}

                  {step.isButton && (
                    <div className="mt-4">
                      <button
                        disabled
                        className="inline-flex items-center gap-2.5 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground opacity-80 cursor-not-allowed transition-all hover:border-primary hover:text-primary hover:opacity-100"
                      >
                        <Puzzle size={15} className="text-primary" />
                        Install VS Code Extension
                        <span className="ml-1 rounded-sm bg-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                          coming soon
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
