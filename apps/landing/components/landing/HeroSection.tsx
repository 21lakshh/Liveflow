import { motion } from "framer-motion";
import HeroVisualizer from "./HeroVisualizer";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-20 lg:pt-0">
        {/* Left */}
        <div className="z-10">

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6"
          >
            Visualize AI Agent
            <br />
            Conversations{" "}
            <span className="text-primary glow-text">in Real Time</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg text-secondary-foreground max-w-md mb-10 leading-relaxed"
          >
            Liveflow lets you watch your LiveKit agents think — see active agents, tool calls, and conversation flow as it happens.
          </motion.p>
        </div>

        {/* Right */}
        <div className="z-10 w-full flex justify-center lg:justify-end">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full max-w-[560px]"
          >
            <HeroVisualizer />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
