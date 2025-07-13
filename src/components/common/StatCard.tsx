import React from 'react';
import { motion } from 'framer-motion';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  color: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  delay?: number;
}

const colorClasses = {
  blue: {
    bg: 'from-blue-500/10 to-blue-600/10',
    border: 'border-blue-500/20',
    icon: 'text-blue-400',
    text: 'text-blue-400'
  },
  purple: {
    bg: 'from-purple-500/10 to-purple-600/10',
    border: 'border-purple-500/20',
    icon: 'text-purple-400',
    text: 'text-purple-400'
  },
  green: {
    bg: 'from-green-500/10 to-green-600/10',
    border: 'border-green-500/20',
    icon: 'text-green-400',
    text: 'text-green-400'
  },
  red: {
    bg: 'from-red-500/10 to-red-600/10',
    border: 'border-red-500/20',
    icon: 'text-red-400',
    text: 'text-red-400'
  },
  orange: {
    bg: 'from-orange-500/10 to-orange-600/10',
    border: 'border-orange-500/20',
    icon: 'text-orange-400',
    text: 'text-orange-400'
  }
};

export function StatCard({ title, value, change, icon: Icon, color, delay = 0 }: StatCardProps) {
  const classes = colorClasses[color];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`bg-gradient-to-br ${classes.bg} backdrop-blur-xl border ${classes.border} 
                  rounded-xl p-6 transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg bg-slate-800/50 ${classes.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
        {change !== undefined && (
          <span className={`text-xs font-medium ${
            change >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </motion.div>
  );
}