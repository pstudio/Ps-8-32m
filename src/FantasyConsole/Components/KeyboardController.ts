import { Memory } from './NewMemory';
import { Observable, Subject } from 'rxjs/Rx';

export class KeyboardController {
  // private tickCounter: number;

  public static readonly KEY_INTERRUPT = 0;
  public static readonly LAST_KEY = 2;

  public static readonly KEYS_ADDRESS = 8;

  private keysChanged: boolean = false;

  private readonly _keySignal: Subject<number>;
  public get keySignal(): Observable<number> {
    return this._keySignal.asObservable();
  }

  constructor(private keyram: Memory) {
    this._keySignal = new Subject<number>();
  }

  process(tick: number) {
    // this.tickCounter += tick;
    // while (this.tickCounter > 0) {
    //   this.tickCounter--;
    // }
    if (!this.keysChanged)
      return;

    const interruptAddress = this.keyram.dataView.getUint16(KeyboardController.KEY_INTERRUPT, true);
    this._keySignal.next(interruptAddress);
    this.keysChanged = false;
  }

  setKey(keycode: number, isDown: boolean) {
    // console.log(keycode);
    this.keyram.uint8Clamped[KeyboardController.KEYS_ADDRESS + keycode] = isDown ? 255 : 0;
    this.keyram.uint8Clamped[KeyboardController.LAST_KEY] = keycode;
    this.keysChanged = true;
  }

  //#region key codes

  public static readonly KC_SPACE         = 0x00;
  public static readonly KC_EXCLAMATION   = 0x01;
  public static readonly KC_QUOTE         = 0x02;
  public static readonly KC_HASH          = 0x03;
  public static readonly KC_DOLLAR        = 0x04;
  public static readonly KC_PERCENT       = 0x05;
  public static readonly KC_AMPERSAND     = 0x06;
  public static readonly KC_SINGLEQUOTE   = 0x07;
  public static readonly KC_OPENPARENS    = 0x08;
  public static readonly KC_CLOSEDPARENS  = 0x09;
  public static readonly KC_MULTIPLY      = 0x0a;
  public static readonly KC_PLUS          = 0x0b;
  public static readonly KC_COMMA         = 0x0c;
  public static readonly KC_MINUS         = 0x0d;
  public static readonly KC_PERIOD        = 0x0e;
  public static readonly KC_SLASH         = 0x0f;
  public static readonly KC_ZERO          = 0x10;
  public static readonly KC_ONE           = 0x11;
  public static readonly KC_TWO           = 0x12;
  public static readonly KC_THREE         = 0x13;
  public static readonly KC_FOUR          = 0x14;
  public static readonly KC_FIVE          = 0x15;
  public static readonly KC_SIX           = 0x16;
  public static readonly KC_SEVEN         = 0x17;
  public static readonly KC_EIGHT         = 0x18;
  public static readonly KC_NINE          = 0x19;
  public static readonly KC_COLON         = 0x1a;
  public static readonly KC_SEMICOLON     = 0x1b;
  public static readonly KC_LESS          = 0x1c;
  public static readonly KC_EQUAL         = 0x1d;
  public static readonly KC_GREATER       = 0x1e;
  public static readonly KC_QUESTION      = 0x1f;
  public static readonly KC_AT            = 0x20;
  public static readonly KC_CA            = 0x21;
  public static readonly KC_CB            = 0x22;
  public static readonly KC_CC            = 0x23;
  public static readonly KC_CD            = 0x24;
  public static readonly KC_CE            = 0x25;
  public static readonly KC_CF            = 0x26;
  public static readonly KC_CG            = 0x27;
  public static readonly KC_CH            = 0x28;
  public static readonly KC_CI            = 0x29;
  public static readonly KC_CJ            = 0x2a;
  public static readonly KC_CK            = 0x2b;
  public static readonly KC_CL            = 0x2c;
  public static readonly KC_CM            = 0x2d;
  public static readonly KC_CN            = 0x2e;
  public static readonly KC_CO            = 0x2f;
  public static readonly KC_CP            = 0x30;
  public static readonly KC_CQ            = 0x31;
  public static readonly KC_CR            = 0x32;
  public static readonly KC_CS            = 0x33;
  public static readonly KC_CT            = 0x34;
  public static readonly KC_CU            = 0x35;
  public static readonly KC_CV            = 0x36;
  public static readonly KC_CW            = 0x37;
  public static readonly KC_CX            = 0x38;
  public static readonly KC_CY            = 0x39;
  public static readonly KC_CZ            = 0x3a;
  public static readonly KC_OPENBRACK     = 0x3b;
  public static readonly KC_BACKSLASH     = 0x3c;
  public static readonly KC_CLOSEDBRACK   = 0x3d;
  public static readonly KC_HAT           = 0x3e;
  public static readonly KC_UNDERSCORE    = 0x3f;
  public static readonly KC_BACKTICK      = 0x40;
  public static readonly KC_A             = 0x41;
  public static readonly KC_B             = 0x42;
  public static readonly KC_C             = 0x43;
  public static readonly KC_D             = 0x44;
  public static readonly KC_E             = 0x45;
  public static readonly KC_F             = 0x46;
  public static readonly KC_G             = 0x47;
  public static readonly KC_H             = 0x48;
  public static readonly KC_I             = 0x49;
  public static readonly KC_J             = 0x4a;
  public static readonly KC_K             = 0x4b;
  public static readonly KC_L             = 0x4c;
  public static readonly KC_M             = 0x4d;
  public static readonly KC_N             = 0x4e;
  public static readonly KC_O             = 0x4f;
  public static readonly KC_P             = 0x50;
  public static readonly KC_Q             = 0x51;
  public static readonly KC_R             = 0x52;
  public static readonly KC_S 	          = 0x53;
  public static readonly KC_T             = 0x54;
  public static readonly KC_U             = 0x55;
  public static readonly KC_V             = 0x56;
  public static readonly KC_W             = 0x57;
  public static readonly KC_X             = 0x58;
  public static readonly KC_Y             = 0x59;
  public static readonly KC_Z             = 0x5a;
  public static readonly KC_OPENCURLY     = 0x5b;
  public static readonly KC_PIPE          = 0x5c;
  public static readonly KC_CLOSEDCURLY   = 0x5d;
  public static readonly KC_TILDE         = 0x5e;
  public static readonly KC_POUND         = 0x5f;
  public static readonly KC_CIRCLE        = 0x60;
  public static readonly KC_RARROW        = 0x61;
  public static readonly KC_LARROW        = 0x62;
  public static readonly KC_UARROW        = 0x63;
  public static readonly KC_DARROW        = 0x64;

  public static readonly KC_ENTER         = 0x80;
  public static readonly KC_TAB           = 0x81;
  public static readonly KC_BACKSPACE     = 0x82;
  public static readonly KC_SHIFT         = 0x83;
  public static readonly KC_ALT           = 0x84;
  public static readonly KC_CTRL          = 0x85;

  //#endregion

  charToKeyCode(char: string): number {
    switch (char) {
      case ' ':                 return KeyboardController.KC_SPACE         ;
      case '!':                 return KeyboardController.KC_EXCLAMATION   ;
      case '"':                 return KeyboardController.KC_QUOTE         ;
      case '#':                 return KeyboardController.KC_HASH          ;
      case '$':                 return KeyboardController.KC_DOLLAR        ;
      case '%':                 return KeyboardController.KC_PERCENT       ;
      case '&':                 return KeyboardController.KC_AMPERSAND     ;
      case '\'':                return KeyboardController.KC_SINGLEQUOTE   ;
      case '(':                 return KeyboardController.KC_OPENPARENS    ;
      case ')':                 return KeyboardController.KC_CLOSEDPARENS  ;
      case '*':                 return KeyboardController.KC_MULTIPLY      ;
      case '+':                 return KeyboardController.KC_PLUS          ;
      case ',':                 return KeyboardController.KC_COMMA         ;
      case '-':                 return KeyboardController.KC_MINUS         ;
      case '.':                 return KeyboardController.KC_PERIOD        ;
      case '/':                 return KeyboardController.KC_SLASH         ;
      case '0':                 return KeyboardController.KC_ZERO          ;
      case '1':                 return KeyboardController.KC_ONE           ;
      case '2':                 return KeyboardController.KC_TWO           ;
      case '3':                 return KeyboardController.KC_THREE         ;
      case '4':                 return KeyboardController.KC_FOUR          ;
      case '5':                 return KeyboardController.KC_FIVE          ;
      case '6':                 return KeyboardController.KC_SIX           ;
      case '7':                 return KeyboardController.KC_SEVEN         ;
      case '8':                 return KeyboardController.KC_EIGHT         ;
      case '9':                 return KeyboardController.KC_NINE          ;
      case ':':                 return KeyboardController.KC_COLON         ;
      case ';':                 return KeyboardController.KC_SEMICOLON     ;
      case '<':                 return KeyboardController.KC_LESS          ;
      case '=':                 return KeyboardController.KC_EQUAL         ;
      case '>':                 return KeyboardController.KC_GREATER       ;
      case '?':                 return KeyboardController.KC_QUESTION      ;
      case '@':                 return KeyboardController.KC_AT            ;
      case 'A':                 return KeyboardController.KC_CA            ;
      case 'B':                 return KeyboardController.KC_CB            ;
      case 'C':                 return KeyboardController.KC_CC            ;
      case 'D':                 return KeyboardController.KC_CD            ;
      case 'E':                 return KeyboardController.KC_CE            ;
      case 'F':                 return KeyboardController.KC_CF            ;
      case 'G':                 return KeyboardController.KC_CG            ;
      case 'H':                 return KeyboardController.KC_CH            ;
      case 'I':                 return KeyboardController.KC_CI            ;
      case 'J':                 return KeyboardController.KC_CJ            ;
      case 'K':                 return KeyboardController.KC_CK            ;
      case 'L':                 return KeyboardController.KC_CL            ;
      case 'M':                 return KeyboardController.KC_CM            ;
      case 'N':                 return KeyboardController.KC_CN            ;
      case 'O':                 return KeyboardController.KC_CO            ;
      case 'P':                 return KeyboardController.KC_CP            ;
      case 'Q':                 return KeyboardController.KC_CQ            ;
      case 'R':                 return KeyboardController.KC_CR            ;
      case 'S':                 return KeyboardController.KC_CS            ;
      case 'T':                 return KeyboardController.KC_CT            ;
      case 'U':                 return KeyboardController.KC_CU            ;
      case 'V':                 return KeyboardController.KC_CV            ;
      case 'W':                 return KeyboardController.KC_CW            ;
      case 'X':                 return KeyboardController.KC_CX            ;
      case 'Y':                 return KeyboardController.KC_CY            ;
      case 'Z':                 return KeyboardController.KC_CZ            ;
      case '[':                 return KeyboardController.KC_OPENBRACK     ;
      case '\\':                return KeyboardController.KC_BACKSLASH     ;
      case ']':                 return KeyboardController.KC_CLOSEDBRACK   ;
      case '^':                 return KeyboardController.KC_HAT           ;
      case '_':                 return KeyboardController.KC_UNDERSCORE    ;
      case '`':                 return KeyboardController.KC_BACKTICK      ;
      case 'a':                 return KeyboardController.KC_A             ;
      case 'b':                 return KeyboardController.KC_B             ;
      case 'c':                 return KeyboardController.KC_C             ;
      case 'd':                 return KeyboardController.KC_D             ;
      case 'e':                 return KeyboardController.KC_E             ;
      case 'f':                 return KeyboardController.KC_F             ;
      case 'g':                 return KeyboardController.KC_G             ;
      case 'h':                 return KeyboardController.KC_H             ;
      case 'i':                 return KeyboardController.KC_I             ;
      case 'j':                 return KeyboardController.KC_J             ;
      case 'k':                 return KeyboardController.KC_K             ;
      case 'l':                 return KeyboardController.KC_L             ;
      case 'm':                 return KeyboardController.KC_M             ;
      case 'n':                 return KeyboardController.KC_N             ;
      case 'o':                 return KeyboardController.KC_O             ;
      case 'p':                 return KeyboardController.KC_P             ;
      case 'q':                 return KeyboardController.KC_Q             ;
      case 'r':                 return KeyboardController.KC_R             ;
      case 's':                 return KeyboardController.KC_S             ;
      case 't':                 return KeyboardController.KC_T             ;
      case 'u':                 return KeyboardController.KC_U             ;
      case 'v':                 return KeyboardController.KC_V             ;
      case 'w':                 return KeyboardController.KC_W             ;
      case 'x':                 return KeyboardController.KC_X             ;
      case 'y':                 return KeyboardController.KC_Y             ;
      case 'z':                 return KeyboardController.KC_Z             ;
      case '{':                 return KeyboardController.KC_OPENCURLY     ;
      case '|':                 return KeyboardController.KC_PIPE          ;
      case '}':                 return KeyboardController.KC_CLOSEDCURLY   ;
      case '~':                 return KeyboardController.KC_TILDE         ;
      case '£':                 return KeyboardController.KC_POUND         ;
      case '¤':                 return KeyboardController.KC_CIRCLE        ;
      case 'ArrowRight':        return KeyboardController.KC_RARROW        ;
      case 'ArrowLeft':         return KeyboardController.KC_LARROW        ;
      case 'ArrowUp':           return KeyboardController.KC_UARROW        ;
      case 'ArrowDown':         return KeyboardController.KC_DARROW        ;
      case 'Enter':             return KeyboardController.KC_ENTER         ;
      case 'Tab':               return KeyboardController.KC_TAB           ;
      case 'Backspace':         return KeyboardController.KC_BACKSPACE     ;
      case 'Shift':             return KeyboardController.KC_SHIFT         ;
      case 'Alt':               return KeyboardController.KC_ALT           ;
      case 'Control':           return KeyboardController.KC_CTRL          ;
      default:                  return 239;
    }
  }
}