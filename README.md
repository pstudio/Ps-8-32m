# Ps 8-32m Fantasy Console
The Ps 8-32m is a fantasy console made for the [FC Dev Jam](https://itch.io/jam/fc-dev-jam).
The console is only tested with Google Chrome.

The following is a list of features for the console:

* 160 x 96 pixels 1-bit display
* Display divided into 8 x 8 pixels blocks
* 30 FPS refresh rate
* 32K of memory for user programs
* Custom character table
* Custom 8-bit processor that works with 8-, 16-, and 32-bit integers

Besides the fantasy console the following tools / dev features are provided:

* Scalable output display
* The choice of pixel perfect or fuzzy up-scaling
* The possibility of pausing the console and stepping through it 'x' cycles at a time
* A character encoder tool that can encode a bitmap image into a data array that can be used as character maps in the fantasy console.
* A memory debugger that can display the memory at any given point. Vital for debugging programs.
* A simple compiler that can compile a custom assembly language into byte code that can be loaded into the fantasy console and executed.

# Getting started
The Ps 8-32m starts in paused mode. Press the 'resume/pause' button in the menu to toggle if the console is running. Make sure the Compiler tool is selected. The compiler comes with a few example programs. Select a program from the examples dropdown. Press the 'Compile' button. The byte code should show up in the output window and an 'Execute' button should appear. Press the execute button and make sure you have pressed the 'resume/pause' button in the main menu so the computer is running. You should know see the program running.

Compiling and then executing a program through the compile tool is currently the only way to run a program in the Ps 8-32m.

# Memory layout
The following list illustrates the Ps 8-32m memory layout:

* 0x0000 - 0x7FFF: This is currently user available memory. When a program is loaded it starts at address 0x0000
* 0x8000 - 0x979C: VRAM. This is the memory dedicated to the video controller.
  * 0x8000: Display mode. 0 is block mode. 1 is character text mode.
  * 0x8001 - 0x8003: Background palette. RGB colors.
  * 0x8004 - 0x8006: Foreground palette. RGB colors.
  * 0x8007: Current character map. The video controller supports 3 character maps. 0 is the default character map. 1 and 2 is user assignable character maps.
  * 0x8008 - 0x8009: Sync interrupt address. This interrupt occurs every second. Assign a 16-bit address here to execute some code when the interrupt occurs. If these 2 bytes are 0 the interrupt will not execute.
  * 0x800a - 0x800b: HBlank interrupt address. This interrupt occurs every hblank. Assign a 16-bit address here to execute some code when the interrupt occurs. If these 2 bytes are 0 the interrupt will not execute.
  * 0x800c - 0x800d: VBlank interrupt address. This interrupt occurs every vblank. Assign a 16-bit address here to execute some code when the interrupt occurs. If these 2 bytes are 0 the interrupt will not execute.
  * 0x8010 - 0x878F: Default character map. Each byte represents 8 pixels in a character block.
  * 0x8790 - 0x8F0F: User character map 1. Each byte represents 8 pixels in a character block.
  * 0x8F10 - 0x968F: User character map 2. Each byte represents 8 pixels in a character block.
  * 0x9690 - 0x97c7: Display memory. Each byte represents a character block that is displayed.
* 0x97c8 - 0x98c7: Keyboard memory
  * 0x97c8 - 0x97c9: Key interrupt address. This interrupt occurs every time a key is pressed or released. Assign a 16-bit address here to execute some code when the interrupt occurs. If these 2 bytes are 0 the interrupt will not execute.
  * 0x97ca: Last key. Contains the last key that was pressed or released.
  * 0x97d0 - 0x98c7: Keyboard map. Each byte indicates if a key is pressed (255) or not (0). A specifics keys address is defined as 0x97d0 + keycode. Note that many of these addresses are unused.

# Keycodes
This is a list of the currently defined keycodes:

* KC_SPACE         = 0x00
* KC_EXCLAMATION   = 0x01
* KC_QUOTE         = 0x02
* KC_HASH          = 0x03
* KC_DOLLAR        = 0x04
* KC_PERCENT       = 0x05
* KC_AMPERSAND     = 0x06
* KC_SINGLEQUOTE   = 0x07
* KC_OPENPARENS    = 0x08
* KC_CLOSEDPARENS  = 0x09
* KC_MULTIPLY      = 0x0a
* KC_PLUS          = 0x0b
* KC_COMMA         = 0x0c
* KC_MINUS         = 0x0d
* KC_PERIOD        = 0x0e
* KC_SLASH         = 0x0f
* KC_ZERO          = 0x10
* KC_ONE           = 0x11
* KC_TWO           = 0x12
* KC_THREE         = 0x13
* KC_FOUR          = 0x14
* KC_FIVE          = 0x15
* KC_SIX           = 0x16
* KC_SEVEN         = 0x17
* KC_EIGHT         = 0x18
* KC_NINE          = 0x19
* KC_COLON         = 0x1a
* KC_SEMICOLON     = 0x1b
* KC_LESS          = 0x1c
* KC_EQUAL         = 0x1d
* KC_GREATER       = 0x1e
* KC_QUESTION      = 0x1f
* KC_AT            = 0x20
* KC_CA            = 0x21
* KC_CB            = 0x22
* KC_CC            = 0x23
* KC_CD            = 0x24
* KC_CE            = 0x25
* KC_CF            = 0x26
* KC_CG            = 0x27
* KC_CH            = 0x28
* KC_CI            = 0x29
* KC_CJ            = 0x2a
* KC_CK            = 0x2b
* KC_CL            = 0x2c
* KC_CM            = 0x2d
* KC_CN            = 0x2e
* KC_CO            = 0x2f
* KC_CP            = 0x30
* KC_CQ            = 0x31
* KC_CR            = 0x32
* KC_CS            = 0x33
* KC_CT            = 0x34
* KC_CU            = 0x35
* KC_CV            = 0x36
* KC_CW            = 0x37
* KC_CX            = 0x38
* KC_CY            = 0x39
* KC_CZ            = 0x3a
* KC_OPENBRACK     = 0x3b
* KC_BACKSLASH     = 0x3c
* KC_CLOSEDBRACK   = 0x3d
* KC_HAT           = 0x3e
* KC_UNDERSCORE    = 0x3f
* KC_BACKTICK      = 0x40
* KC_A             = 0x41
* KC_B             = 0x42
* KC_C             = 0x43
* KC_D             = 0x44
* KC_E             = 0x45
* KC_F             = 0x46
* KC_G             = 0x47
* KC_H             = 0x48
* KC_I             = 0x49
* KC_J             = 0x4a
* KC_K             = 0x4b
* KC_L             = 0x4c
* KC_M             = 0x4d
* KC_N             = 0x4e
* KC_O             = 0x4f
* KC_P             = 0x50
* KC_Q             = 0x51
* KC_R             = 0x52
* KC_S 	          = 0x53
* KC_T             = 0x54
* KC_U             = 0x55
* KC_V             = 0x56
* KC_W             = 0x57
* KC_X             = 0x58
* KC_Y             = 0x59
* KC_Z             = 0x5a
* KC_OPENCURLY     = 0x5b
* KC_PIPE          = 0x5c
* KC_CLOSEDCURLY   = 0x5d
* KC_TILDE         = 0x5e
* KC_POUND         = 0x5f
* KC_CIRCLE        = 0x60
* KC_RARROW        = 0x61
* KC_LARROW        = 0x62
* KC_UARROW        = 0x63
* KC_DARROW        = 0x64
* KC_ENTER         = 0x80
* KC_TAB           = 0x81
* KC_BACKSPACE     = 0x82
* KC_SHIFT         = 0x83
* KC_ALT           = 0x84
* KC_CTRL          = 0x85

# Assembly reference
The processor has 21 registers. 16 of those are user assignable 8-bit registers known as R-registers.
The R-registers can also store 16-, and 32-bit integers if they are combined.
E.g. if $r0 is 0xAB and $r1 is 0xCD then if you read a 16-bit number from either $r0 or $r1 the value 0xCDAB is returned. Note that the processor uses little endianess.

* 0        => (8/16/32-bit) the value 0. Can't be assigned directly
* pc       => (16-bit) program counter - points to the next address to process. Can't be assigned directly
* mem      => (16-bit) memory address - user set address that points at memory
* ret      => (16-bit) return address - ret = pc+1 when call is executed. pc = ret when return is executed. Can't be assigned directly
* int      => (16-bit) return address for interrupt handlers. Can't be assigned directly
* r0..r15  => (8-bit) registers

 Opcodes are 1 byte. Register addresses are also 1 byte.
 Some instructions can use multiple registers to create 16- or 32-bit numbers.
 
 * r* = 1 byte register
 * i, i8    = 1 byte immediate signed number
 * i16      = 2 bytes immediate signed number
 * i32      = 4 bytes immediate signed number
 * ui, ui8  = 1 byte immediate unsigned number
 * ui16     = 2 bytes immediate unsigned number
 * ui32     = 4 bytes immediate unsigned number
 

 Bit Manipulation:
 * and r0 r1 r2   =>  r0 = r1 & r2
 * andi r0 r1 i8  =>  r0 = r1 & i8
 *
 * or*
 * xor*
 * not*
 * shr*
 * shl*
 
 Arithmetic:
 * add8 r0 r1 r2  =>  r0 = r1 + r2
 * addi8 r0 r1 i  =>  r0 = r1 + i
 * add16 r2 r4    =>  r0r1 = r2r3 + r4r5
 * add32 r4 r8    =>  r0r1r2r3 = r4r5r6r7 + r8r9r10r11
 * addi16 r2 i16  =>  r0r1 = r2r3 + i16
 * addi32 r4 i32  =>  r0r1r2r3 = r4r5r6r7 + i32
 * addu*          =>  unsigned versions of all the above addition instructions
 *
 * sub*           =>  subtraction
 * mul*           =>  multiplication
 * div*           =>  integer division - remainder is placed in r12-r15
 
 Store/Load/Move:
 * li8 r0 i8      =>  r0 = i
 * li16 r0 i16    =>  r0r1 = i16
 * li32 r0 i32    =>  r0r1r2r3 = i32
 * lui8 r0 i8      =>  r0 = i
 * lui16 r0 i16    =>  r0r1 = i16
 * lui32 r0 i32    =>  r0r1r2r3 = i32
 * lm8 r0         =>  r0 = mem*
 * lm16 r0        =>  r0r1 = mem*
 * lm32 r0        =>  r0r1r2r3 = mem*
 * sm r0          =>  mem* = r0
 * sm8 r0         =>  mem* = r0
 * sm16 r0        =>  mem* = r0r1
 * sm32 r0        =>  mem* = r0r1r2r3
 * mov8 r0 r1      =>  r0 = r1
 * mov16 r0 r2      =>  r0r1 = r2r3
 * mov32 r0 r4      =>  r0r1r2r3 = r4r5r6r7
 * mvm a16 b16 i8 =>  a16[0..i8-1] = b16[0..i8-1] copy memory from a16 to b16
 * clm a16 i8 c8  =>  a16[0..i8-1] = c8 clear memory from a16
 
 Control (every register is treated as an usigned number):
 
 * beq8 r0 r1 i16 =>  pc = i16 if r0 = r1
 * beq16 r0 r2 i16 =>  pc = i16 if r0r1 = r2r3
 * beq32 r0 r4 i16 =>  pc = i16 if r0r1r2r3 = r4r5r6r7
 *
 * blt*           =>  branch if less than
 * ble*           =>  branch if less or equal
 * bgt*           =>  branch if greater than
 * bge*           =>  branch if greater or equeal
 * bne*           =>  branch if not equal
 
 Jumping:
 * jmp i16        =>  pc = i16
 * call i16       =>  ret = pc + 1, jmp i16
 * ret            =>  jmp ret, ret = 0
 * rint           =>  jmp rint, rint = 0
 
 Skipping:
 * nop            =>  do nothing, skip a cycle
 * nopi i8        =>  do nothing, skip i8 cycles