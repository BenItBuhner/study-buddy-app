"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import Cookies from "js-cookie";

// Define available theme colors
const themeColors = [
  { name: "Default", value: "default", color: "#4f46e5" },
  { name: "Blue", value: "blue", color: "#2563eb" },
  { name: "Green", value: "green", color: "#16a34a" },
  { name: "Purple", value: "purple", color: "#9333ea" },
  { name: "Pink", value: "pink", color: "#db2777" },
  { name: "Orange", value: "orange", color: "#ea580c" },
];

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [themeColor, setThemeColor] = useState("default");
  
  // Use useEffect to handle component mounting and cookie access
  useEffect(() => {
    setMounted(true);
    
    // Load theme color from cookie
    const savedThemeColor = Cookies.get("theme-color") || "default";
    setThemeColor(savedThemeColor);
    
    // Apply theme color
    applyThemeColor(savedThemeColor);
  }, []);
  
  // Function to apply theme color by setting CSS variables
  const applyThemeColor = (colorValue: string) => {
    const root = document.documentElement;
    const selectedTheme = themeColors.find(c => c.value === colorValue) || themeColors[0];
    
    // Set CSS variable for primary color
    root.style.setProperty("--primary-temp", selectedTheme.color);
    
    // Set the actual color with correct opacity/shade versions after a small delay to ensure transition
    setTimeout(() => {
      root.style.setProperty("--primary", selectedTheme.color);
    }, 10);
  };
  
  // Handle theme color change
  const handleColorChange = (colorValue: string) => {
    setThemeColor(colorValue);
    Cookies.set("theme-color", colorValue, { expires: 365 });
    applyThemeColor(colorValue);
  };
  
  // Don't render anything until mounted to prevent hydration errors
  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Theme color picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <Palette className="h-4 w-4" />
            <span className="sr-only">Select theme color</span>
            <span 
              className="absolute bottom-1 right-1 w-2 h-2 rounded-full" 
              style={{ backgroundColor: themeColors.find(c => c.value === themeColor)?.color }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Theme Color</Label>
            <div className="grid grid-cols-3 gap-2">
              {themeColors.map((color) => (
                <Button
                  key={color.value}
                  variant="outline"
                  className="w-full h-8 p-0 border-2 hover:border-primary transition-all"
                  style={{ 
                    backgroundColor: color.color + "20", // Add transparency
                    borderColor: color.value === themeColor ? color.color : "transparent",
                  }}
                  onClick={() => handleColorChange(color.value)}
                >
                  <span className="sr-only">{color.name}</span>
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Light/Dark mode toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 