import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface UserProfile {
  user: {
    id: number;
    username: string;
    email: string;
    full_name?: string | null;
    created_at: string;
    is_active: boolean;
  };
}

// Animated text component that makes random characters scale
const AnimatedText = ({ text }: { text: string }) => {
  const [animatedChars, setAnimatedChars] = useState<string[]>([]);

  useEffect(() => {
    setAnimatedChars(text.split(''));
  }, [text]);

  useEffect(() => {
    // Add CSS animation styles to document head
    const style = document.createElement('style');
    style.textContent = `
      .animated-char {
        display: inline-block;
        transition: all 1s ease-in-out;
      }
      .scale-animation {
        transform: scale(1.2);
        color:rgb(148, 72, 236);
        text-shadow: 0 0 10px rgba(236, 72, 153, 0.5);
      }
      .animated-text {
        word-spacing: 0.1em;
        line-height: 1.3;
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
      }
    `;
    document.head.appendChild(style);

    const interval = setInterval(() => {
      // Randomly select characters to animate
      const chars = document.querySelectorAll('.animated-char');
      chars.forEach((char) => {
        if (Math.random() > 0.88) { // 12% chance for each character to animate
          char.classList.add('scale-animation');
          setTimeout(() => {
            char.classList.remove('scale-animation');
          }, 1000);
        }
      });
    }, 1000); // Run every 150ms

    return () => {
      clearInterval(interval);
      document.head.removeChild(style);
    };
  }, []);

  return (
    <span className="animated-text">
      {animatedChars.map((char, index) => (
        <span
          key={index}
          className="animated-char"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
};

export default function DashboardPage() {
  const { accessToken } = useAuth();

  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await api.get<UserProfile>("/auth/me");
      return res.data;
    },
    enabled: !!accessToken
  });

  const userName = data?.user?.full_name || data?.user?.username || 'Friend';

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-120px)] w-full overflow-hidden">
      {/* Centered Animated Welcome Message */}
      <div className="text-center px-4 w-full max-w-5xl mx-auto">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient bg-300% leading-normal break-words hyphens-auto whitespace-normal">
          <AnimatedText text={`Hi ${userName}, Welcome to the future of Fintech`} />
        </h1>
      </div>
    </div>
  );
} 