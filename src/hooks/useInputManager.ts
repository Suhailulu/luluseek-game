import { useEffect, useRef } from 'react';
import { GameState, PlayerRole, PlayerStatus } from '../types';

export interface InputManagerOptions {
  gameState: GameState;
  role?: PlayerRole;
  status?: PlayerStatus;
  isMobile?: boolean;
  onToggleMap?: () => void;
  onToggleTimer?: () => void;
  onCloseOverlays?: () => void;
}

export interface MovementInput {
  dx: number;
  dy: number;
  isSprinting: boolean;
  canMove: boolean;
}

export function useInputManager(options: InputManagerOptions) {
  const keysPressedRef = useRef<Record<string, boolean>>({});
  const joystickVectorRef = useRef<{ dx: number; dy: number; length: number }>({ dx: 0, dy: 0, length: 0 });
  const isMouseDownRef = useRef(false);
  const mousePosRef = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Gate check: determines whether movement input should be processed.
   * - Hiders can move during 'hiding' (countdown) and 'playing' states.
   * - Seekers can only move during 'playing' state (locked during countdown).
   * - Spectators or eliminated players cannot move.
   */
  const canMove = (): boolean => {
    const { gameState, role, status } = optionsRef.current;
    if (!role || role === 'spectator') return false;
    if (status !== 'alive') return false;
    if (gameState === 'lobby' || gameState === 'ended') return false;
    if (gameState === 'hiding' && role === 'seeker') return false;
    return true;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if focus is inside input/textarea fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const k = e.key ? e.key.toLowerCase() : '';
      const code = e.code ? e.code.toLowerCase() : '';

      const isMoveKey =
        ['w', 'a', 's', 'd', 'up', 'down', 'left', 'right', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k) ||
        ['keyw', 'keya', 'keys', 'keyd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shiftleft', 'shiftright'].includes(code);

      if (isMoveKey) {
        if (k) keysPressedRef.current[k] = true;
        if (code) keysPressedRef.current[code] = true;

        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'up', 'down', 'left', 'right'].includes(k) || code.startsWith('arrow')) {
          e.preventDefault();
        }
      }

      if (k === 'm' && !e.repeat) {
        optionsRef.current.onToggleMap?.();
      }
      if (k === 't' && !e.repeat) {
        optionsRef.current.onToggleTimer?.();
      }
      if (k === 'escape') {
        optionsRef.current.onCloseOverlays?.();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key ? e.key.toLowerCase() : '';
      const code = e.code ? e.code.toLowerCase() : '';

      if (k) keysPressedRef.current[k] = false;
      if (code) keysPressedRef.current[code] = false;
    };

    const handleBlur = () => {
      keysPressedRef.current = {};
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const getMovementInput = (): MovementInput => {
    if (!canMove()) {
      return { dx: 0, dy: 0, isSprinting: false, canMove: false };
    }

    let dx = 0;
    let dy = 0;

    const keys = keysPressedRef.current;
    if (keys['w'] || keys['keyw'] || keys['arrowup'] || keys['up']) dy -= 1;
    if (keys['s'] || keys['keys'] || keys['arrowdown'] || keys['down']) dy += 1;
    if (keys['a'] || keys['keya'] || keys['arrowleft'] || keys['left']) dx -= 1;
    if (keys['d'] || keys['keyd'] || keys['arrowright'] || keys['right']) dx += 1;

    // Joystick takes precedence if active
    if (joystickVectorRef.current.length > 0) {
      dx = joystickVectorRef.current.dx;
      dy = joystickVectorRef.current.dy;
    }

    const isSprinting = Boolean(
      keys['shift'] || keys['shiftleft'] || keys['shiftright']
    );

    return { dx, dy, isSprinting, canMove: true };
  };

  return {
    keysPressedRef,
    joystickVectorRef,
    isMouseDownRef,
    mousePosRef,
    canMove,
    getMovementInput,
  };
}
