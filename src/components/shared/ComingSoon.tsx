import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface ComingSoonProps {
  title:       string;
  description: string;
  icon?:       React.ComponentType<{ className?: string }>;
}

export function ComingSoon({ title, description, icon: Icon = Zap }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5">
          <Icon className="w-8 h-8" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-3">{title}</h2>
        <p className="text-muted-foreground max-w-sm leading-relaxed">{description}</p>
        <span className="inline-block mt-5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
          Building now — coming soon
        </span>
      </motion.div>
    </div>
  );
}
