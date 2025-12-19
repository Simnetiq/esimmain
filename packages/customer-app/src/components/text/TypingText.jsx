'use client';

import React, { useState, useEffect } from 'react';

const TypingText = ({
  text,
  typingSpeed = 75,
  pauseDuration = 1500,
  showCursor = true,
  cursorCharacter = '|',
  className = '',
  textColors = [],
  variableSpeed = null,
}) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentText = Array.isArray(text) ? text[currentTextIndex] : text;
  const currentColor = textColors[currentTextIndex] || textColors[0] || 'inherit';

  useEffect(() => {
    if (!Array.isArray(text)) {
      // Single text - just type it out once and keep cursor
      let timeout;
      if (displayedText.length < currentText.length) {
        const speed = variableSpeed
          ? Math.floor(Math.random() * (variableSpeed.max - variableSpeed.min + 1)) + variableSpeed.min
          : typingSpeed;
        timeout = setTimeout(() => {
          setDisplayedText(currentText.slice(0, displayedText.length + 1));
        }, speed);
      }
      return () => clearTimeout(timeout);
    } else {
      // Multiple texts - cycle through them
      let timeout;

      if (isDeleting) {
        // Deleting text
        if (displayedText.length > 0) {
          const speed = variableSpeed
            ? Math.floor(Math.random() * (variableSpeed.max - variableSpeed.min + 3)) + variableSpeed.min
            : typingSpeed / 8; // Delete faster than typing
          timeout = setTimeout(() => {
            setDisplayedText(displayedText.slice(0, -1));
          }, speed);
        } else {
          // Move to next text
          setIsDeleting(false);
          setCurrentTextIndex((prev) => (prev + 1) % text.length);
        }
      } else {
        // Typing text
        if (displayedText.length < currentText.length) {
          const speed = variableSpeed
            ? Math.floor(Math.random() * (variableSpeed.max - variableSpeed.min + 1)) + variableSpeed.min
            : typingSpeed;
          timeout = setTimeout(() => {
            setDisplayedText(currentText.slice(0, displayedText.length + 1));
          }, speed);
        } else {
          // Finished typing, wait then start deleting
          timeout = setTimeout(() => {
            setIsDeleting(true);
          }, pauseDuration);
        }
      }

      return () => clearTimeout(timeout);
    }
  }, [displayedText, currentText, isDeleting, typingSpeed, pauseDuration, variableSpeed, text]);

  return (
    <span className={className} style={{ color: currentColor }}>
      {displayedText}
      {showCursor && <span className="animate-pulse">{cursorCharacter}</span>}
    </span>
  );
};

export default TypingText;
