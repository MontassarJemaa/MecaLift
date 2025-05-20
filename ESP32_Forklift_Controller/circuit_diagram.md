# ESP32 Forklift Controller Circuit Diagram

## Components Required

1. ESP32 Development Board
2. 4 DC Motors for Mecanum Wheels
3. 2 Dual H-Bridge Motor Drivers (L298N or similar)
4. 1 DC Motor or Linear Actuator for Fork Lift
5. Power Supply (Battery pack or adapter)
6. Jumper Wires
7. Breadboard or PCB

## Circuit Connections

### ESP32 to Motor Drivers

```
ESP32 Pin   |   Connection
------------|------------------
GPIO16      |   Motor Driver 1 - Input 1 (Front Left Motor Pin 1)
GPIO17      |   Motor Driver 1 - Input 2 (Front Left Motor Pin 2)
GPIO18      |   Motor Driver 1 - Input 3 (Front Right Motor Pin 1)
GPIO19      |   Motor Driver 1 - Input 4 (Front Right Motor Pin 2)
GPIO21      |   Motor Driver 2 - Input 1 (Rear Left Motor Pin 1)
GPIO22      |   Motor Driver 2 - Input 2 (Rear Left Motor Pin 2)
GPIO23      |   Motor Driver 2 - Input 3 (Rear Right Motor Pin 1)
GPIO25      |   Motor Driver 2 - Input 4 (Rear Right Motor Pin 2)
GPIO26      |   Motor Driver (Fork) - Input 1
GPIO27      |   Motor Driver (Fork) - Input 2
GND         |   Common Ground
```

### Motor Driver 1 (Front Motors)

```
L298N Pin   |   Connection
------------|------------------
Input 1     |   ESP32 GPIO16
Input 2     |   ESP32 GPIO17
Input 3     |   ESP32 GPIO18
Input 4     |   ESP32 GPIO19
Enable A    |   5V (or PWM from ESP32 for speed control)
Enable B    |   5V (or PWM from ESP32 for speed control)
Out 1       |   Front Left Motor +
Out 2       |   Front Left Motor -
Out 3       |   Front Right Motor +
Out 4       |   Front Right Motor -
VCC         |   5V
GND         |   Common Ground
VS          |   Motor Power Supply (7-12V)
```

### Motor Driver 2 (Rear Motors)

```
L298N Pin   |   Connection
------------|------------------
Input 1     |   ESP32 GPIO21
Input 2     |   ESP32 GPIO22
Input 3     |   ESP32 GPIO23
Input 4     |   ESP32 GPIO25
Enable A    |   5V (or PWM from ESP32 for speed control)
Enable B    |   5V (or PWM from ESP32 for speed control)
Out 1       |   Rear Left Motor +
Out 2       |   Rear Left Motor -
Out 3       |   Rear Right Motor +
Out 4       |   Rear Right Motor -
VCC         |   5V
GND         |   Common Ground
VS          |   Motor Power Supply (7-12V)
```

### Fork Lift Motor

```
L298N Pin   |   Connection
------------|------------------
Input 1     |   ESP32 GPIO26
Input 2     |   ESP32 GPIO27
Enable      |   5V (or PWM from ESP32 for speed control)
Out 1       |   Fork Motor +
Out 2       |   Fork Motor -
VCC         |   5V
GND         |   Common Ground
VS          |   Motor Power Supply (7-12V)
```

## Power Supply

- ESP32: Powered via USB or 5V regulated supply
- Motor Drivers: 7-12V for motor power (VS pin)
- Logic: 5V for motor driver logic (VCC pin)

## Notes

1. Make sure all grounds are connected together
2. Use capacitors (100μF) across motor power supply to reduce noise
3. Use diodes for motor back-EMF protection if not included in the motor driver
4. For higher current motors, ensure adequate cooling for the motor drivers
5. The ESP32 PWM channels are configured in the code to control motor speed

## Mecanum Wheel Configuration

```
    FRONT
  FL      FR
  ↖      ↗
    
  ↙      ↘
  RL      RR
    REAR
```

FL = Front Left
FR = Front Right
RL = Rear Left
RR = Rear Right

## Movement Logic

- Forward: All motors forward
- Backward: All motors backward
- Left: FL and RL backward, FR and RR forward
- Right: FL and RL forward, FR and RR backward
- Diagonal: Combinations of the above
- Rotate: Left side forward, right side backward (or vice versa)
