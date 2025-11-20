'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface ScrollDirectionOptions {
  threshold?: number;
  hideThreshold?: number;
  element?: HTMLElement | null;
  enableMobileNav?: boolean;
}

export function useScrollDirection(options: ScrollDirectionOptions = {}) {
  const { threshold = 10, hideThreshold = 100, element, enableMobileNav = true } = options;
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const lastUpdateTime = useRef(0);
  const isVisibleRef = useRef(true);

  const updateScrollDirection = useCallback(() => {
    const now = Date.now();
    const scrollY = element 
      ? element.scrollTop 
      : window.pageYOffset || document.documentElement.scrollTop;
    
    // Prevent too frequent updates (debounce)
    if (now - lastUpdateTime.current < 50) { // 50ms debounce
      return;
    }
    
    // Increased threshold to prevent bouncing
    if (Math.abs(scrollY - lastScrollY.current) < threshold) {
      ticking.current = false;
      return;
    }
    
    const direction = scrollY > lastScrollY.current ? 'down' : 'up';
    setScrollDirection(direction);
    
    // Only apply mobile nav logic if enabled
    if (enableMobileNav) {
      let shouldBeVisible = isVisibleRef.current;
      
      // More stable logic with hysteresis
      if (direction === 'up' || scrollY < 50) {
        shouldBeVisible = true;
      } else if (direction === 'down' && scrollY > hideThreshold) {
        shouldBeVisible = false;
      }
      
      // Only update if state actually changed
      if (shouldBeVisible !== isVisibleRef.current) {
        isVisibleRef.current = shouldBeVisible;
        setIsVisible(shouldBeVisible);
      }
    }
    
    lastScrollY.current = scrollY > 0 ? scrollY : 0;
    lastUpdateTime.current = now;
    ticking.current = false;
  }, [element, threshold, hideThreshold, enableMobileNav]);

  useEffect(() => {
    const onScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    if (element) {
      element.addEventListener('scroll', onScroll, { passive: true });
    } else {
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    
    return () => {
      if (element) {
        element.removeEventListener('scroll', onScroll);
      } else {
        window.removeEventListener('scroll', onScroll);
      }
    };
  }, [element, updateScrollDirection]);

  return { scrollDirection, isVisible };
}
