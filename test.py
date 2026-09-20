import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen import Circuit

ALL_ERRORS = []

def check(c, groups, diffs=()):
    errs = c.verify(groups, diffs)
    if errs:
        print(f"=== {c.name} ===")
        for e in errs:
            print("  ERROR:", e)
        ALL_ERRORS.extend(errs)
    else:
        print(f"{c.name}: OK ({len(groups)} nets verified)")

circuits = []

# ============================================================ Half Adder
c = Circuit("Half Adder")
A = c.pin(100,100,"A")
B = c.pin(100,160,"B")
xr = c.gate("XOR Gate", 240,100)
an = c.gate("AND Gate", 240,180)
Sum = c.pin(330,100,"Sum",output=True)
Carry = c.pin(330,180,"Carry",output=True)
c.fanout(A, [xr['in'][0], an['in'][0]])
c.fanout(B, [xr['in'][1], an['in'][1]])
c.wire(xr['out'], Sum)
c.wire(an['out'], Carry)
check(c, [
    [A, xr['in'][0], an['in'][0]],
    [B, xr['in'][1], an['in'][1]],
    [xr['out'], Sum],
    [an['out'], Carry],
], diffs=[(A,B)])
circuits.append(c)

# ============================================================ Full Adder
c = Circuit("Full Adder")
A = c.pin(100,100,"A")
B = c.pin(100,180,"B")
Cin = c.pin(100,320,"Cin")
xr1 = c.gate("XOR Gate", 240,140)     # A xor B
an1 = c.gate("AND Gate", 240,240)     # A and B
xr2 = c.gate("XOR Gate", 400,180)     # (A xor B) xor Cin = Sum
an2 = c.gate("AND Gate", 400,300)     # (A xor B) and Cin
orr = c.gate("OR Gate",  520,260)     # an1 or an2 = Cout
Sum = c.pin(490,180,"Sum",output=True)
Cout = c.pin(610,260,"Cout",output=True)

c.fanout(A, [xr1['in'][0], an1['in'][0]])
c.fanout(B, [xr1['in'][1], an1['in'][1]])
c.fanout(Cin, [xr2['in'][1], an2['in'][1]])
c.fanout(xr1['out'], [xr2['in'][0], an2['in'][0]])
c.wire(xr2['out'], Sum)
c.wire(an1['out'], orr['in'][0])
c.wire(an2['out'], orr['in'][1])
c.wire(orr['out'], Cout)
check(c, [
    [A, xr1['in'][0], an1['in'][0]],
    [B, xr1['in'][1], an1['in'][1]],
    [Cin, xr2['in'][1], an2['in'][1]],
    [xr1['out'], xr2['in'][0], an2['in'][0]],
    [xr2['out'], Sum],
    [an1['out'], orr['in'][0]],
    [an2['out'], orr['in'][1]],
    [orr['out'], Cout],
], diffs=[(A,B),(A,Cin),(xr1['out'],an1['out'])])
circuits.append(c)

# ============================================================ Half Subtractor
c = Circuit("Half Subtractor")
A = c.pin(100,100,"A")
B = c.pin(100,160,"B")
xr = c.gate("XOR Gate", 240,100)      # Diff = A xor B
notA = c.notgate(240,220)             # A'
an = c.gate("AND Gate", 360,220)      # Borrow = A' and B
Diff = c.pin(330,100,"Diff",output=True)
Borrow = c.pin(450,220,"Borrow",output=True)

c.fanout(A, [xr['in'][0], notA['in']])
c.fanout(B, [xr['in'][1], an['in'][1]])
c.wire(notA['out'], an['in'][0])
c.wire(xr['out'], Diff)
c.wire(an['out'], Borrow)
check(c, [
    [A, notA['in'], xr['in'][0]],
    [B, xr['in'][1], an['in'][1]],
    [notA['out'], an['in'][0]],
    [xr['out'], Diff],
    [an['out'], Borrow],
], diffs=[(A,B)])
circuits.append(c)

# ============================================================ Full Subtractor
# Diff = A xor B xor Bin ; Bout = A'B + A'Bin + B*Bin = A'(B xor Bin) + B*Bin  [same structure as full adder with A complemented]
c = Circuit("Full Subtractor")
A = c.pin(100,100,"A")
B = c.pin(100,180,"B")
Bin = c.pin(100,320,"Bin")
notA = c.notgate(240,60)
xr1 = c.gate("XOR Gate", 240,220)     # B xor Bin
xr2 = c.gate("XOR Gate", 400,180)     # A xor B xor Bin = Diff
an1 = c.gate("AND Gate", 400,300)     # B and Bin
an2 = c.gate("AND Gate", 520,80)      # A' and (B xor Bin)
orr = c.gate("OR Gate",  620,240)     # Bout
Diff = c.pin(490,180,"Diff",output=True)
Bout = c.pin(710,240,"Bout",output=True)

c.fanout(A, [xr2['in'][0], notA['in']])
c.fanout(B, [xr1['in'][0], an1['in'][0]])
c.fanout(Bin, [xr1['in'][1], an1['in'][1]])
c.fanout(xr1['out'], [xr2['in'][1], an2['in'][1]])
c.wire(notA['out'], an2['in'][0])
c.wire(xr2['out'], Diff)
c.wire(an2['out'], orr['in'][0])
c.wire(an1['out'], orr['in'][1])
c.wire(orr['out'], Bout)
check(c, [
    [A, xr2['in'][0], notA['in']],
    [B, xr1['in'][0], an1['in'][0]],
    [Bin, xr1['in'][1], an1['in'][1]],
    [xr1['out'], xr2['in'][1], an2['in'][1]],
    [notA['out'], an2['in'][0]],
    [xr2['out'], Diff],
    [an2['out'], orr['in'][0]],
    [an1['out'], orr['in'][1]],
    [orr['out'], Bout],
], diffs=[(A,B),(B,Bin)])
circuits.append(c)

# ============================================================ BCD to 2421 code converter
# X0=B0 ; X1=B3B2'+B2'B1+B2B1'B0 ; X2=B2B0'+B2B1+B3B2' ; X3=B2B0+B2B1+B3B2'
c = Circuit("BCD to 2421 Converter")
B3 = c.pin(100,80,"B3")
B2 = c.pin(100,200,"B2")
B1 = c.pin(100,320,"B1")
B0 = c.pin(100,440,"B0")

notB2 = c.notgate(260,200)
notB1 = c.notgate(260,320)
notB0 = c.notgate(260,440)

T1 = c.gate("AND Gate", 460,80, 2)   # B3.B2'
T2 = c.gate("AND Gate", 460,170,2)   # B2.B1
T3 = c.gate("AND Gate", 460,260,2)   # B2'.B1
T4 = c.gate("AND Gate", 460,370,3)   # B2.B1'.B0
T5 = c.gate("AND Gate", 460,470,2)   # B2.B0'
T6 = c.gate("AND Gate", 460,560,2)   # B2.B0

OR1 = c.gate("OR Gate", 650,200,3)   # X1 = T1+T3+T4
OR2 = c.gate("OR Gate", 650,350,3)   # X2 = T5+T2+T1
OR3 = c.gate("OR Gate", 650,500,3)   # X3 = T6+T2+T1

X0p = c.pin(740,80,"X0",output=True)
X1p = c.pin(740,200,"X1",output=True)
X2p = c.pin(740,350,"X2",output=True)
X3p = c.pin(740,500,"X3",output=True)

c.fanout(B3, [T1['in'][0]])
c.fanout(B2, [notB2['in'], T2['in'][0], T4['in'][0], T5['in'][0], T6['in'][0]])
c.fanout(B1, [notB1['in'], T3['in'][1]])
c.fanout(B0, [notB0['in'], T4['in'][2], T6['in'][1], X0p])
c.fanout(notB2['out'], [T1['in'][1], T3['in'][0]])
c.fanout(notB1['out'], [T4['in'][1]])
c.fanout(notB0['out'], [T5['in'][1]])

c.fanout(T1['out'], [OR1['in'][0], OR2['in'][2], OR3['in'][2]])
c.fanout(T2['out'], [OR2['in'][1], OR3['in'][1]])
c.fanout(T3['out'], [OR1['in'][1]])
c.fanout(T4['out'], [OR1['in'][2]])
c.fanout(T5['out'], [OR2['in'][0]])
c.fanout(T6['out'], [OR3['in'][0]])

c.fanout(OR1['out'], [X1p])
c.fanout(OR2['out'], [X2p])
c.fanout(OR3['out'], [X3p])

check(c, [
    [B3, T1['in'][0]],
    [B2, notB2['in'], T2['in'][0], T4['in'][0], T5['in'][0], T6['in'][0]],
    [B1, notB1['in'], T3['in'][1]],
    [B0, notB0['in'], T4['in'][2], T6['in'][1], X0p],
    [notB2['out'], T1['in'][1], T3['in'][0]],
    [notB1['out'], T4['in'][1]],
    [notB0['out'], T5['in'][1]],
    [T1['out'], OR1['in'][0], OR2['in'][2], OR3['in'][2]],
    [T2['out'], OR2['in'][1], OR3['in'][1]],
    [T3['out'], OR1['in'][1]],
    [T4['out'], OR1['in'][2]],
    [T5['out'], OR2['in'][0]],
    [T6['out'], OR3['in'][0]],
    [OR1['out'], X1p],
    [OR2['out'], X2p],
    [OR3['out'], X3p],
], diffs=[(B3,B2),(B2,B1),(B1,B0),(T1['out'],T2['out']),(notB2['out'],notB1['out'])])
circuits.append(c)

# ============================================================ 8421 (BCD) to 2421 code converter
# Z0=B0 ; Z1=B3'B2'B1+B3B1'+B3'B2B1'B0 ; Z2=B3+B3'B2B0'+B3'B2B1 ; Z3=B3+B2(B1+B0)
c = Circuit("8421 to 2421 Converter")
B3 = c.pin(100,80,"B3")
B2 = c.pin(100,200,"B2")
B1 = c.pin(100,320,"B1")
B0 = c.pin(100,440,"B0")

notB3 = c.notgate(260,80)
notB2 = c.notgate(260,200)
notB1 = c.notgate(260,320)
notB0 = c.notgate(260,440)

# Z1 terms
T1 = c.gate("AND Gate", 460,80, 3)   # B3'.B2'.B1    -> Z1
T2 = c.gate("AND Gate", 460,180,2)   # B3.B1'        -> Z1
T3 = c.gate("AND Gate", 460,280,4)   # B3'.B2.B1'.B0 -> Z1
# Z2 terms
T4 = c.gate("AND Gate", 460,400,3)   # B3'.B2.B0'    -> Z2
T5 = c.gate("AND Gate", 460,490,3)   # B3'.B2.B1     -> Z2
# Z3 terms
T6 = c.gate("OR Gate",  460,600,2)   # B1+B0         (inner for Z3)
T7 = c.gate("AND Gate", 580,600,2)   # B2.(B1+B0)    -> Z3

OR_Z1 = c.gate("OR Gate", 650,180,3) # Z1 = T1+T2+T3
OR_Z2 = c.gate("OR Gate", 650,440,3) # Z2 = B3+T4+T5
OR_Z3 = c.gate("OR Gate", 700,560,2) # Z3 = B3+T7

Z0p = c.pin(800,440,"Z0",output=True) # Z0 = B0 (direct)
Z1p = c.pin(800,180,"Z1",output=True)
Z2p = c.pin(800,440,"Z2",output=True) # note: Z2 shares y with Z0 placeholder
Z3p = c.pin(800,560,"Z3",output=True)

# Use distinct output y-values to avoid coord clash
Z0p = c.pin(800,460,"Z0",output=True)
Z1p = c.pin(800,180,"Z1",output=True)
Z2p = c.pin(800,420,"Z2",output=True)
Z3p = c.pin(800,560,"Z3",output=True)

c.fanout(B3, [notB3['in'], T2['in'][0], OR_Z2['in'][0], OR_Z3['in'][0]])
c.fanout(B2, [notB2['in'], T3['in'][1], T4['in'][1], T5['in'][1], T7['in'][0]])
c.fanout(B1, [notB1['in'], T1['in'][2], T5['in'][2], T6['in'][0]])
c.fanout(B0, [notB0['in'], T3['in'][3], T6['in'][1], Z0p])

c.fanout(notB3['out'], [T1['in'][0], T3['in'][0], T4['in'][0], T5['in'][0]])
c.fanout(notB2['out'], [T1['in'][1]])
c.fanout(notB1['out'], [T2['in'][1], T3['in'][2]])
c.fanout(notB0['out'], [T4['in'][2]])

c.fanout(T6['out'], [T7['in'][1]])
c.fanout(T7['out'], [OR_Z3['in'][1]])

c.fanout(T1['out'], [OR_Z1['in'][0]])
c.fanout(T2['out'], [OR_Z1['in'][1]])
c.fanout(T3['out'], [OR_Z1['in'][2]])
c.fanout(T4['out'], [OR_Z2['in'][1]])
c.fanout(T5['out'], [OR_Z2['in'][2]])

c.fanout(OR_Z1['out'], [Z1p])
c.fanout(OR_Z2['out'], [Z2p])
c.fanout(OR_Z3['out'], [Z3p])

check(c, [
    [B3, notB3['in'], T2['in'][0], OR_Z2['in'][0], OR_Z3['in'][0]],
    [B2, notB2['in'], T3['in'][1], T4['in'][1], T5['in'][1], T7['in'][0]],
    [B1, notB1['in'], T1['in'][2], T5['in'][2], T6['in'][0]],
    [B0, notB0['in'], T3['in'][3], T6['in'][1], Z0p],
    [notB3['out'], T1['in'][0], T3['in'][0], T4['in'][0], T5['in'][0]],
    [notB2['out'], T1['in'][1]],
    [notB1['out'], T2['in'][1], T3['in'][2]],
    [notB0['out'], T4['in'][2]],
    [T1['out'], OR_Z1['in'][0]],
    [T2['out'], OR_Z1['in'][1]],
    [T3['out'], OR_Z1['in'][2]],
    [T4['out'], OR_Z2['in'][1]],
    [T5['out'], OR_Z2['in'][2]],
    [T6['out'], T7['in'][1]],
    [T7['out'], OR_Z3['in'][1]],
    [OR_Z1['out'], Z1p],
    [OR_Z2['out'], Z2p],
    [OR_Z3['out'], Z3p],
], diffs=[(B3,B2),(B2,B1),(B1,B0),(notB3['out'],notB2['out'])])
circuits.append(c)

# ============================================================ Excess-3 to BCD converter
# B0=E0' ; B1=E1 XOR E0 ; B2=E2E0+E2'E0'+E2'E1' ; B3=E3(E2+E1E0)
c = Circuit("Excess-3 to BCD")
E3 = c.pin(100,80,"E3")
E2 = c.pin(100,200,"E2")
E1 = c.pin(100,320,"E1")
E0 = c.pin(100,440,"E0")

notE2 = c.notgate(260,200)
notE1 = c.notgate(260,320)
notE0 = c.notgate(260,440)        # B0 = E0'

XOR_B1 = c.gate("XOR Gate", 380,380) # B1 = E1 XOR E0

# B2 = E2.E0 + E2'.E0' + E2'.E1'
S1 = c.gate("AND Gate", 480,160,2) # E2.E0
S2 = c.gate("AND Gate", 480,280,2) # E2'.E0'
S3 = c.gate("AND Gate", 480,380,2) # E2'.E1'
OR_B2 = c.gate("OR Gate", 640,280,3) # B2

# B3 = E3.(E2 + E1.E0)
S4 = c.gate("AND Gate", 480,520,2) # E1.E0
OR_inner = c.gate("OR Gate",  600,500,2) # E2 + E1.E0
AND_B3 = c.gate("AND Gate", 720,480,2) # E3.(E2+E1.E0) = B3

B0p = c.pin(370,440,"B0",output=True)  # B0 = E0' (output of NOT gate)
B1p = c.pin(480,380,"B1",output=True)
B2p = c.pin(750,280,"B2",output=True)
B3p = c.pin(830,480,"B3",output=True)

c.fanout(E3, [AND_B3['in'][0]])
c.fanout(E2, [notE2['in'], S1['in'][0], OR_inner['in'][0]])
c.fanout(E1, [notE1['in'], XOR_B1['in'][0], S4['in'][0]])
c.fanout(E0, [notE0['in'], XOR_B1['in'][1], S1['in'][1], S4['in'][1]])

c.fanout(notE0['out'], [B0p, S2['in'][1]])
c.fanout(notE2['out'], [S2['in'][0], S3['in'][0]])
c.fanout(notE1['out'], [S3['in'][1]])

c.fanout(XOR_B1['out'], [B1p])

c.fanout(S1['out'], [OR_B2['in'][0]])
c.fanout(S2['out'], [OR_B2['in'][1]])
c.fanout(S3['out'], [OR_B2['in'][2]])
c.fanout(OR_B2['out'], [B2p])

c.fanout(S4['out'], [OR_inner['in'][1]])
c.fanout(OR_inner['out'], [AND_B3['in'][1]])
c.fanout(AND_B3['out'], [B3p])

check(c, [
    [E3, AND_B3['in'][0]],
    [E2, notE2['in'], S1['in'][0], OR_inner['in'][0]],
    [E1, notE1['in'], XOR_B1['in'][0], S4['in'][0]],
    [E0, notE0['in'], XOR_B1['in'][1], S1['in'][1], S4['in'][1]],
    [notE0['out'], B0p, S2['in'][1]],
    [notE2['out'], S2['in'][0], S3['in'][0]],
    [notE1['out'], S3['in'][1]],
    [XOR_B1['out'], B1p],
    [S1['out'], OR_B2['in'][0]],
    [S2['out'], OR_B2['in'][1]],
    [S3['out'], OR_B2['in'][2]],
    [OR_B2['out'], B2p],
    [S4['out'], OR_inner['in'][1]],
    [OR_inner['out'], AND_B3['in'][1]],
    [AND_B3['out'], B3p],
], diffs=[(E3,E2),(E2,E1),(E1,E0),(notE2['out'],notE1['out'])])
circuits.append(c)

# ============================================================ 3-bit Binary Adder (ripple carry, built from full-adder gate logic)
c = Circuit("3-bit Adder")
A0 = c.pin(100,85,"A0"); B0 = c.pin(100,145,"B0")
A1 = c.pin(100,265,"A1"); B1 = c.pin(100,325,"B1")
A2 = c.pin(100,445,"A2"); B2 = c.pin(100,505,"B2")
Cin = c.pin(100,605,"Cin")

def full_adder_stage(c, A, B, Cin, ybase, xbase):
    xr1 = c.gate("XOR Gate", xbase+140, ybase)
    an1 = c.gate("AND Gate", xbase+140, ybase+90)
    xr2 = c.gate("XOR Gate", xbase+300, ybase+30)
    an2 = c.gate("AND Gate", xbase+300, ybase+140)
    orr = c.gate("OR Gate",  xbase+420, ybase+100)
    c.fanout(A, [xr1['in'][0], an1['in'][0]])
    c.fanout(B, [xr1['in'][1], an1['in'][1]])
    c.fanout(Cin, [xr2['in'][1], an2['in'][1]])
    c.fanout(xr1['out'], [xr2['in'][0], an2['in'][0]])
    c.wire(an1['out'], orr['in'][0])
    c.wire(an2['out'], orr['in'][1])
    groups = [
        [A, xr1['in'][0], an1['in'][0]],
        [B, xr1['in'][1], an1['in'][1]],
        [Cin, xr2['in'][1], an2['in'][1]],
        [xr1['out'], xr2['in'][0], an2['in'][0]],
        [an1['out'], orr['in'][0]],
        [an2['out'], orr['in'][1]],
    ]
    return xr2['out'], orr['out'], groups

Sum0, Cout0, g0 = full_adder_stage(c, A0, B0, Cin, 60, 220)
Sum1, Cout1, g1 = full_adder_stage(c, A1, B1, Cout0, 240, 220)
Sum2, Cout2, g2 = full_adder_stage(c, A2, B2, Cout1, 420, 220)

S0p = c.pin(910,95,"Sum0",output=True)
S1p = c.pin(910,275,"Sum1",output=True)
S2p = c.pin(910,455,"Sum2",output=True)
Cp  = c.pin(910,615,"Cout",output=True)

c.fanout(Sum0, [S0p])
c.fanout(Sum1, [S1p])
c.fanout(Sum2, [S2p])
c.fanout(Cout2, [Cp])

groups = g0+g1+g2 + [[Sum0,S0p],[Sum1,S1p],[Sum2,S2p],[Cout2,Cp]]
check(c, groups, diffs=[(A0,B0),(A0,A1)])
circuits.append(c)

# ============================================================ 4-bit Parity Generator and Checker
c = Circuit("4-bit Parity Generator and Checker")
D3 = c.pin(100,80,"D3"); D2 = c.pin(100,140,"D2")
D1 = c.pin(100,200,"D1"); D0 = c.pin(100,260,"D0")

# --- generator: P = D3 xor D2 xor D1 xor D0 (even parity bit) ---
g1 = c.gate("XOR Gate", 260,110)
g2 = c.gate("XOR Gate", 400,150)
g3 = c.gate("XOR Gate", 540,190)
Pp = c.pin(630,190,"P (parity bit)",output=True)

c.fanout(D3, [g1['in'][0]])
c.fanout(D2, [g1['in'][1]])
c.fanout(g1['out'], [g2['in'][0]])
c.fanout(D1, [g2['in'][1]])
c.fanout(g2['out'], [g3['in'][0]])
c.fanout(D0, [g3['in'][1]])
c.fanout(g3['out'], [Pp])

# --- checker: takes the transmitted 4 data bits + the parity bit P, ---
# --- Error = D3 xor D2 xor D1 xor D0 xor P  (1 = transmission error) ---
TD3 = c.pin(100,400,"D3 (received)")
TD2 = c.pin(100,460,"D2 (received)")
TD1 = c.pin(100,520,"D1 (received)")
TD0 = c.pin(100,580,"D0 (received)")
TP  = c.pin(100,640,"P (received)")

h1 = c.gate("XOR Gate", 260,430)
h2 = c.gate("XOR Gate", 400,470)
h3 = c.gate("XOR Gate", 540,530)
h4 = c.gate("XOR Gate", 680,585)
Ep = c.pin(770,585,"Error",output=True)

c.fanout(TD3, [h1['in'][0]])
c.fanout(TD2, [h1['in'][1]])
c.fanout(h1['out'], [h2['in'][0]])
c.fanout(TD1, [h2['in'][1]])
c.fanout(h2['out'], [h3['in'][0]])
c.fanout(TD0, [h3['in'][1]])
c.fanout(h3['out'], [h4['in'][0]])
c.fanout(TP, [h4['in'][1]])
c.fanout(h4['out'], [Ep])

check(c, [
    [D3, g1['in'][0]], [D2, g1['in'][1]],
    [g1['out'], g2['in'][0]], [D1, g2['in'][1]],
    [g2['out'], g3['in'][0]], [D0, g3['in'][1]],
    [g3['out'], Pp],
    [TD3, h1['in'][0]], [TD2, h1['in'][1]],
    [h1['out'], h2['in'][0]], [TD1, h2['in'][1]],
    [h2['out'], h3['in'][0]], [TD0, h3['in'][1]],
    [h3['out'], h4['in'][0]], [TP, h4['in'][1]],
    [h4['out'], Ep],
], diffs=[(D3,D2),(TD3,TD2),(g1['out'],h1['out'])])
circuits.append(c)

print("ALL circuits built. total errors:", len(ALL_ERRORS))

# ============================================================ Export to Logisim
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "circuits")
print(f"\nExporting {len(circuits)} circuits to: {OUT_DIR}/")
for c in circuits:
    path = c.to_logisim(OUT_DIR)
    print(f"  Saved: {os.path.basename(path)}")
print("Done. Open any .circ file in Logisim (File → Open).")