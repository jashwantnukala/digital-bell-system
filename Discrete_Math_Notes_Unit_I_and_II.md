# Discrete Mathematics — Concise Notes (Unit I & Unit II)

---

# UNIT I: Sets, Propositions, Induction

## 1. Set Theory Basics
- **Set** = well-defined, unordered collection of distinct objects (elements).
- Written `a ∈ A` (a belongs to A), `a ∉ A` (a does not belong to A).
- **Representation:**
  1. **Roster/Tabular** — list elements: `A = {a, e, i, o, u}`
  2. **Statement form** — describe in words: "set of all even integers"
  3. **Set-builder** — `A = {x | x has property P}`

**Important standard sets:** N (naturals), Z (integers), Z⁺ (positive integers), Q (rationals), R (reals), C (complex).

## 2. Types of Sets
| Type | Meaning | Example |
|---|---|---|
| Empty/Null (∅) | No elements | {x∈N \| 7<x<8} = ∅ |
| Singleton | Exactly 1 element | {x∈N \| 7<x<9} = {8} |
| Finite | Countable, definite number of elements | {1,2,3} |
| Infinite | Never-ending elements | Set of natural numbers |
| Subset (A⊆B) | Every element of A is in B | {1,2}⊆{1,2,3} |
| Proper subset (A⊂B) | A⊆B and A≠B | {1,2}⊂{1,2,3} |
| Superset | Y⊇X if X⊆Y | |
| Universal Set (U) | Contains all elements under discussion | |
| Power Set P(S) | Set of all subsets of S; if \|S\|=n, \|P(S)\|=2ⁿ | S={x,y,z} → P(S) has 8 subsets |
| Equal sets | A⊆B and B⊆A | |

**Cardinality:** number of elements in a set, written n(A) or \|A\|.
- \|∅\| = 0; if A infinite, \|A\| = ∞.

**Countable set:** finite, or has a 1-1 correspondence (mapping) with natural numbers (e.g., integers, even numbers).
**Uncountable set:** no such mapping exists (e.g., real numbers, irrationals) — proved because infinitely many numbers exist between any two reals.

## 3. Set Operations
| Operation | Symbol | Meaning |
|---|---|---|
| Union | A∪B | elements in A or B or both |
| Intersection | A∩B | elements in both A and B |
| Difference | A−B | elements in A but not B |
| Symmetric Difference | A⊕B | (A−B)∪(B−A) = elements in exactly one set |
| Complement | A' | U − A |

**Disjoint sets:** A∩B = ∅ (no common elements).

**Key identities (good to memorize):**
- A∪∅=A, A∪U=U, A∪A'=U
- A∩∅=∅, A∩U=A, A∩A'=∅
- A−A=∅, A−∅=A
- A⊕A=∅, A⊕∅=A, A⊕U=A', A⊕A'=U

## 4. Multisets (Bags)
- A set where an element **can repeat**; number of repeats = **multiplicity**.
- `[a,b,c,c,a,c]`: µ(a)=2, µ(b)=1, µ(c)=3.
- **Union:** take the larger multiplicity of each element.
- **Intersection:** take the smaller multiplicity.
- Example: A=[2,2,3], B=[2,3,3,4] → A∪B=[2,2,3,3,4], A∩B=[2,3]

## 5. Principle of Inclusion–Exclusion (PIE)
For 2 sets: **|A∪B| = |A| + |B| − |A∩B|**
For 3 sets: **|A∪B∪C| = |A|+|B|+|C| −|A∩B|−|A∩C|−|B∩C| +|A∩B∩C|**

### Solved Examples

**Ex 1:** Integers 1–100 that are multiples of 2 or 3.
|A|=50 (mult. of 2), |B|=33 (mult. of 3), |A∩B|=16 (mult. of 6)
→ |A∪B| = 50+33−16 = **67**

**Ex 2:** 100 programmers: Java 45, C# 30, Python 20, J∩C=6, J∩P=1, C∩P=5, J∩C∩P=1. Find those proficient in none.
|J∪C∪P| = 45+30+20−6−5−1+1 = 84
Not proficient in any = 100−84 = **16**

**Ex 3:** 350 farmers; B=260, Y=100, R=70, B∩R=40, Y∩R=40, B∩Y=30, find B∩Y∩R (=x).
350 = 260+100+70−40−40−30+x → 350=320+x → **x = 30**

**Ex 4 (practice — bike/car):** 40 people, 18 own bike, 6 own both bike & car → owns a car:
using |Bike∪Car| ≤ 40, and solving gives **28**.

**Ex 5:** Martin's class, 40 students; passed Maths=28, History=29, both=20.
|M∪H| = 28+29−20 = 37 → failed both = 40−37 = **3**

## 6. Propositions (Propositional Logic)
- **Proposition:** declarative sentence that is either **True or False**, never both.
- Not propositions: questions, commands, statements with unknown variables (x+1=2).

**Connectives:**
| Name | Symbol | True when |
|---|---|---|
| Negation | ¬p | p is false |
| Conjunction (AND) | p∧q | both true |
| Disjunction (OR) | p∨q | at least one true |
| Exclusive OR | p⊕q | exactly one true |
| Implication | p→q | false only when p=T, q=F |
| Biconditional | p↔q | both same truth value |

**Conditional terms:** p→q — p = hypothesis, q = conclusion.
- **Converse:** q→p
- **Inverse:** ¬p→¬q
- **Contrapositive:** ¬q→¬p (logically equivalent to original)

### Solved Example — Related Implications
"The home team wins whenever it is raining." → p: it rains, q: home team wins → p→q
- Converse: If the home team wins, then it is raining.
- Inverse: If it is not raining, the home team does not win.
- Contrapositive: If the home team does not win, then it is not raining.

**Tautology:** always true (e.g., p∨¬p)
**Contradiction:** always false (e.g., p∧¬p)

## 7. Laws of Logic (for simplifying/proving equivalence)
- Identity: P∨F≡P, P∧T≡P
- Domination: P∨T≡T, P∧F≡F
- Idempotent: P∨P≡P, P∧P≡P
- Double negation: ¬(¬P)≡P
- Commutative: P∨Q≡Q∨P
- Associative: (P∨Q)∨R≡P∨(Q∨R)
- Distributive: P∨(Q∧R)≡(P∨Q)∧(P∨R)
- **De Morgan's:** ¬(P∧Q)≡¬P∨¬Q ; ¬(P∨Q)≡¬P∧¬Q
- Absorption: P∨(P∧Q)≡P

### Solved Example
Show ¬(p→q) ≡ p∧¬q
¬(p→q) ≡ ¬(¬p∨q) [implication law] ≡ ¬(¬p)∧¬q [De Morgan] ≡ p∧¬q [double negation] ✔

## 8. Normal Forms
- **DNF (Disjunctive Normal Form):** OR of AND terms → (P∧Q)∨(P∧¬Q)
- **CNF (Conjunctive Normal Form):** AND of OR terms → (P∨Q)∧(P∨¬Q)

## 9. Predicates & Quantifiers
- **P(x)** = predicate, becomes a proposition once x is assigned a value.
- **Universal quantifier ∀x P(x):** "P(x) true for all x"
- **Existential quantifier ∃x P(x):** "P(x) true for at least one x"
- **De Morgan for quantifiers:** ¬∃xP(x) ≡ ∀x¬P(x) ; ¬∀xP(x) ≡ ∃x¬P(x)

**Translating English → Logic examples:**
- "All birds fly" → ∀x bird(x)→fly(x)
- "Some boys play cricket" → ∃x boys(x)∧play(x,cricket)

## 10. Methods of Proof
| Method | Idea |
|---|---|
| Direct Proof | Assume P true, derive Q |
| Contrapositive | Prove ¬Q→¬P instead of P→Q |
| Contradiction | Assume statement false, derive a contradiction |
| Cases | Split into possible cases, prove each |
| Existence | Show at least one object satisfying property exists |
| Uniqueness | Show exactly one solution exists |

### Solved Examples
**Direct proof:** If n is even, then n² is even.
n=2k → n²=4k² = 2(2k²), divisible by 2 → even. ✔

**Contrapositive proof:** If n² is even, then n is even.
Prove instead: if n is odd, n² is odd. n=2k+1 → n²=4k²+4k+1 = odd. Hence contrapositive true → original true. ✔

**Contradiction proof:** √2 is irrational.
Assume √2=a/b (lowest terms) → a²=2b² → a even → a=2k → b² also even → b even. Both even contradicts "lowest terms." Hence √2 is irrational. ✔

## 11. Mathematical Induction
Three parts:
1. **Base case:** show true for smallest value (usually n=1)
2. **Inductive hypothesis:** assume true for n=k
3. **Inductive step:** prove true for n=k+1

### Solved Example
Show 1+3+5+...+(2n−1) = n².
- Base case (n=1): 1 = 1² ✔
- Hypothesis: assume 1+3+...+(2k−1) = k²
- Step: 1+3+...+(2k−1)+(2k+1) = k²+(2k+1) = (k+1)² ✔
Hence true for all n by induction.

**Strong induction:** assumes P(1),P(2),...,P(k) all true to prove P(k+1) (used e.g. to show every integer >1 is a product of primes).

---

# UNIT II: Relations, Equivalence Relations, Closures, Warshall's Algorithm, Posets, Permutations & Combinations

## 1. Relations
- **Cartesian Product:** A×B = {(a,b) | a∈A, b∈B}. If |A|=p, |B|=q → |A×B| = pq.
- **Binary relation** R from A to B: R ⊆ A×B. If (a,b)∈R, write aRb.
- **Relation on a set A:** R ⊆ A×A.
- **Domain** = set of first elements used; **Range** = set of second elements used.

### Solved Example
A={0,1,2}, B={a,b}; A×B={(0,a),(0,b),(1,a),(1,b),(2,a),(2,b)}
R={(0,a),(0,b),(1,a),(2,b)} → 0Ra ✔, 2Rb ✔, 1Rb ✘

## 2. Properties of Relations (on set A)
| Property | Condition |
|---|---|
| Reflexive | (a,a)∈R for every a∈A |
| Symmetric | (a,b)∈R ⟹ (b,a)∈R |
| Antisymmetric | (a,b)∈R and (b,a)∈R ⟹ a=b |
| Transitive | (a,b)∈R and (b,c)∈R ⟹ (a,c)∈R |

**Digraph check:**
- Reflexive → loop at every vertex
- Symmetric → every edge has a matching reverse edge
- Antisymmetric → never two opposite edges between distinct vertices
- Transitive → edge x→y and y→z implies edge x→z

**Matrix check (M = relation matrix):**
- Reflexive: all diagonal entries = 1
- Symmetric: M = Mᵀ
- Antisymmetric: Mij=0 or Mji=0 for i≠j

### Solved Example
A={1,2,3,4}; R2={(1,1),(1,2),(2,1)} → Symmetric (every (a,b) has (b,a)), but **not reflexive** (missing (2,2),(3,3),(4,4)).

## 3. Equivalence Relations
- A relation is an **equivalence relation** if it is **reflexive + symmetric + transitive**.
- **Equivalence class of a:** [a]R = {s | (s,a)∈R}
- Key theorem: for a,b∈A → aRb ⟺ [a]=[b] ⟺ [a]∩[b]≠∅. Equivalence classes are either **equal or disjoint**.
- **Partition:** collection of disjoint, non-empty subsets whose union is the whole set — every equivalence relation corresponds to a unique partition (and vice versa).

### Solved Example
A={1,2,3,4,5}, R={(1,1),(2,2),(3,3),(4,4),(5,5),(1,3),(3,1)}
Equivalence classes: [1]={1,3}, [2]={2}, [3]={1,3}, [4]={4}, [5]={5}
→ Partition = {{1,3},{2},{4},{5}}

## 4. Closures of Relations
The **closure** w.r.t. a property = minimum extra pairs added to R so it satisfies that property.
- **Reflexive closure:** add all missing (a,a) pairs.
- **Symmetric closure:** add all missing (b,a) for existing (a,b) — i.e., R ∪ R⁻¹.
- **Transitive closure:** add all pairs needed so that a path of any length between two vertices becomes a direct edge (found via Warshall's Algorithm).

### Solved Example
A={1,2,3}, R={(1,1),(1,2),(2,1),(3,2)}
Missing diagonal pairs: (2,2),(3,3)
**Reflexive closure** = R ∪ {(2,2),(3,3)}

## 5. Warshall's Algorithm (find Transitive Closure)
- Start with W0 = zero-one (adjacency) matrix of R.
- At step k, Wk(i,j)=1 if there's a path from vi to vj using only v1,...,vk as intermediate vertices.
- Formula: **Wk[i][j] = Wk-1[i][j] OR (Wk-1[i][k] AND Wk-1[k][j])**
- After n steps (n = number of vertices), Wn is the transitive closure matrix.

## 6. Partial Orderings (Posets)
- A relation R on set S is a **partial order** if reflexive + antisymmetric + transitive.
- (S,R) is called a **poset**.
- **Comparable:** a,b comparable if a≼b or b≼a.
- **Total/linear order:** every pair of elements is comparable (a "chain").

### Solved Example
Is "≥" a partial order on integers?
- Reflexive: a≥a ✔
- Antisymmetric: a≥b and b≥a ⟹ a=b ✔
- Transitive: a≥b, b≥c ⟹ a≥c ✔
→ Yes, (Z,≥) is a poset.

## 7. Hasse Diagrams
Steps to draw from a digraph of a poset:
1. Remove all loops
2. Remove edges implied by transitivity
3. Arrange all edges pointing upward
4. Remove arrowheads

**Terminology:**
- **Maximal element:** nothing above it (a is maximal if no b with a≼b)
- **Minimal element:** nothing below it
- **Greatest element:** unique element above everything (all b≼a)
- **Least element:** unique element below everything

### Solved Example
Poset ({2,4,5,10,12,20,25}, | ) — maximal elements: **12, 20, 25**; minimal elements: **2, 5**

## 8. Counting Rules
- **Sum Rule:** if a task can be done in m OR n ways (no overlap) → m+n
- **Product Rule:** if task 1 has m ways AND task 2 has n ways → m×n
- **Inclusion-Exclusion for counting:** |A∪B| = |A|+|B|−|A∩B|

### Solved Example
Bit strings of length 8 that start with 1 OR end with 00.
- Start with 1: 2⁷=128
- End with 00: 2⁶=64
- Both (start 1, end 00): 2⁵=32
→ 128+64−32 = **160**

## 9. Permutations
**Definition:** ordered arrangement of objects.
**Formula:** P(n,r) = n!/(n−r)! = n(n−1)(n−2)...(n−r+1)

**Type 1 — distinct objects, r at a time:** P(n,r) = n!/(n-r)!

**Type 2 — objects not all distinct (some repeat):**
P(n) = n! / (r1!·r2!·...·rk!) where r1,r2,...are counts of each repeated type.

**Type 3 — repetition allowed:** P(n,r) = nʳ

### Solved Examples
**Ex 1:** 4 people take seats among 6 vacant seats. P(6,4)=6×5×4×3=**360**

**Ex 2:** Permutations of the word "MISSISSIPPI" (11 letters: M=1, I=4, S=4, P=2)
= 11!/(1!·4!·4!·2!) = 39,916,800/1152 = **34,650**

**Ex 3:** 3-letter words from "SMOKE" with repetition allowed = 5³ = **125**

**Ex 4:** 8 runners, gold/silver/bronze medals. P(8,3)=8×7×6=**336**

**Ex 5:** Car plates: 2 letters + 3 digits (no repeat restriction stated as all distinct chars):
26×25×10×9×8 = **468,000**

## 10. Combinations
**Definition:** unordered selection of objects.
**Formula:** C(n,r) = n! / [r!(n−r)!] , also written nCr

**With repetition allowed:** C(n+r−1, r) [selecting r items from n types, repeats OK]

### Solved Examples
**Ex 1:** Select 5 players from 10-member tennis team.
C(10,5) = 10!/(5!5!) = **252**

**Ex 2:** Select 5 letters from 26 English alphabets.
C(26,5) = 26!/(5!·21!) = **65,780**

**Ex 3:** Committee: 3 from 9 Maths faculty AND 4 from 11 CS faculty.
C(9,3)×C(11,4) = 84×330 = **27,720**

**Ex 4:** Committee of 5 from 7 women & 5 men with at least 3 women.
Cases: 3W2M, 4W1M, 5W0M
= C(7,3)C(5,2) + C(7,4)C(5,1) + C(7,5)C(5,0)
= 35×10 + 35×5 + 21×1 = 350+175+21 = **546**

**Ex 5:** Distribute 10 identical apples among 4 children (repetition allowed selection).
C(10+4−1, 4−1) = C(13,3) = **286**

**Ex 6:** Bit strings of length 10 with exactly four 1s.
C(10,4) = 10!/(4!·6!) = **210**

**Ex 7:** Bit strings of length 10 with at least four 1s.
Total (2¹⁰=1024) − [C(10,0)+C(10,1)+C(10,2)+C(10,3)]
= 1024 − (1+10+45+120) = 1024−176 = **848**

---

---

# PART 2 — ALL REMAINING SOLVED EXAMPLES (from the slides)

## UNIT I — Additional Solved Examples

### Set Theory Symbols (reference table)
| Symbol | Meaning | Symbol | Meaning |
|---|---|---|---|
| {} | Set | n(A) | Cardinal number of A |
| x∈A | x is element of A | P(A) | Power set |
| x∉A | x not element of A | A⊆B | A is subset of B |
| ∃ / ∄ | exists / doesn't exist | A⊂B | A is proper subset of B |
| Φ | Empty set | A⊈B | A not subset of B |
| A=B | Equal sets | B⊇A / B⊃A / B⊉A | superset / proper superset / not superset |

### Solved: Set operations example
U={1,2,3,4,5,6,7,8,9}, A={1,2,5,6}, B={2,5,7}, C={1,3,5,7,9}
- (a) A∩B = **{2,5}** ; A∩C = **{1,5}**
- (b) A∪B = **{1,2,5,6,7}** ; B∪C = **{1,2,3,5,7,9}**
- (c) A' (=U−A) = **{3,4,7,8,9}** ; C' (=U−C) = **{2,4,6,8}**
- (d) A−B = **{1,6}** ; A−C = **{2,6}**
- (e) A⊕B = (A−B)∪(B−A) = {1,6}∪{7} = **{1,6,7}**
  A⊕C = (A−C)∪(C−A) = {2,6}∪{3,7,9} = **{2,3,6,7,9}**
- (f) (A∪C)−B: A∪C={1,2,3,5,6,7,9}, minus B{2,5,7} = **{1,3,6,9}**
  (B⊕C)−A: B⊕C = {2}∪{1,3,9} = {1,2,3,9}, minus A{1,2,5,6} = **{3,9}**

### Solved: 1–1000 divisibility (PIE) — full working
Out of integers 1 to 1000, divisible by 3, 5, or 7:
|A(mult.3)|=⌊1000/3⌋=333, |B(mult.5)|=⌊1000/5⌋=200, |C(mult.7)|=⌊1000/7⌋=142
|A∩B|=⌊1000/15⌋=66, |A∩C|=⌊1000/21⌋=47, |B∩C|=⌊1000/35⌋=28, |A∩B∩C|=⌊1000/105⌋=9
- Divisible by 3 or 5 or 7: 333+200+142−66−47−28+9 = **543**
- Not divisible by 3,5, or 7: 1000−543 = **457**
- Divisible by 3 but NOT by 5 and NOT by 7: |A|−|A∩B|−|A∩C|+|A∩B∩C| = 333−66−47+9 = **229**

### Solved: Tautology / Contradiction / Neither (slide 98)
| Expression | Result | Reason |
|---|---|---|
| a) [P∧(P→Q)]→Q | **Tautology** | This is Modus Ponens — always true |
| b) (P→Q)↔(¬Q→¬P) | **Tautology** | Contrapositive is always equivalent |
| c) (¬P∧Q)∧(P∨¬Q) | **Contradiction** | Truth table gives F in all 4 rows |
| d) (P→¬Q)∨(¬R→P) | **Tautology** | Always true — check: if P=F, first disjunct true vacuously; if P=T, second disjunct (¬R→P) true since P=T |
| e) (P→Q)∧(¬P∨Q) | **Neither** | Simplifies to just P→Q, which is F when P=T,Q=F |
| f) (P→Q)→(P∧Q) | **Neither** | F when P=F,Q=F (since P→Q=T but P∧Q=F); T when P=Q=T |

### Solved: Inference validity practice (slide 109)
**1) Show q follows from p→q, p∨q, ¬q**
1. p→q (given), 2. p∨q (given), 3. ¬q (given)
From (1) and (3): by Modus Tollens → ¬p
From (2) and ¬p: by Disjunctive Syllogism → q
(Note: this actually shows the premise set is contradictory since we assumed ¬q but derive q — meaning these 3 premises together can never all be true; formally, q is "vacuously" implied.)

**2) Show ¬p is implied by ¬(p∧¬q), ¬q∨r, ¬r**
1. ¬(p∧¬q) ≡ ¬p∨q (De Morgan)
2. ¬q∨r
3. ¬r → r is false
From (2) with r false: Disjunctive Syllogism → ¬q
From (1) with ¬q true (q false): Disjunctive Syllogism → **¬p** ✔

**3) Show r follows from p→q, q→r, p**
1. p→q, 2. q→r → Hypothetical Syllogism gives p→r
3. p (given) → Modus Ponens → **r** ✔

### Solved: DNF conversion exercise (slide 114, #3)
Convert ¬(p→(q∧r)) to DNF:
≡ ¬(¬p∨(q∧r)) [implication law]
≡ p∧¬(q∧r) [De Morgan]
≡ p∧(¬q∨¬r) [De Morgan]
≡ **(p∧¬q)∨(p∧¬r)** [distributive law] — this is DNF ✔

---

## UNIT II — Additional Solved Examples

### Solved: Composition S∘R (slide 70)
R = {(1,1),(1,4),(2,3),(3,1),(3,4)}, S = {(1,0),(2,0),(3,1),(3,2),(4,1)}
Rule: (a,c) ∈ S∘R if ∃b with (a,b)∈R and (b,c)∈S.
- (1,1)∈R, (1,0)∈S → (1,0)
- (1,4)∈R, (4,1)∈S → (1,1)
- (2,3)∈R, (3,1)∈S → (2,1); (3,2)∈S → (2,2)
- (3,1)∈R, (1,0)∈S → (3,0)
- (3,4)∈R, (4,1)∈S → (3,1)

**S∘R = {(1,0),(1,1),(2,1),(2,2),(3,0),(3,1)}**

### Solved: Warshall's Algorithm practice (slide 101)
**(a)** A={1,2,3,4}, R={(1,2),(2,1),(2,3),(3,4)}
Tracing reachability: 1→2→1 (cycle), 1→2→3→4; 2→1→2, 2→3→4; 3→4 only.
**Transitive closure R\* = {(1,1),(1,2),(1,3),(1,4),(2,1),(2,2),(2,3),(2,4),(3,4)}**

**(b)** A={1,2,3,4,5,6}, R={(x,y) : |x−y|=2}
R = {(1,3),(3,1),(2,4),(4,2),(3,5),(5,3),(4,6),(6,4)}
This splits into two connected chains: {1,3,5} and {2,4,6}, each fully interconnected (symmetric + chained).
**Transitive closure = all ordered pairs within {1,3,5} (9 pairs) + all ordered pairs within {2,4,6} (9 pairs) = 18 pairs total**

### Solved: Reflexive-transitive closure (slide 109)
A = {(a,b) | b=a−1, a,b∈{1,2,3}} = {(2,1),(3,2)}
- Transitive closure: 3→2→1 needs (3,1) added → {(2,1),(3,2),(3,1)}
- Reflexive closure: add (1,1),(2,2),(3,3)

**Reflexive-transitive closure = {(1,1),(2,2),(3,3),(2,1),(3,2),(3,1)}**

### Solved: Hasse Diagram exercises
**Slide 124:** R on A={1,2,3,4,5} is exactly the "≤" relation.
**Hasse diagram = simple vertical chain: 1 — 2 — 3 — 4 — 5** (1 at bottom, 5 at top, each connected only to its immediate successor).

**Slide 126 (Home assignment):** ({1,2,4,8,12,16}, ≤)
Since ≤ totally orders all integers, this is simply a **chain**: 1 — 2 — 4 — 8 — 12 — 16 (bottom to top, each linked to the next in increasing order).

### Solved: Basics of Counting practice
**4-letter words from ROSE, no repetition:** 4×3×2×1 = **24**
(with repetition allowed it would be 4⁴ = 256, as noted on slide)

**2-digit even numbers from {1,2,3,4,5}, repetition allowed:**
Last digit must be even → only 2,4 available (2 choices); first digit → 5 choices.
Total = 5×2 = **10**

**FE A (75 ways) or FE B (65 ways) student picks one rep (Sum Rule):** 75+65 = **140**
**FE A and FE B pick separate reps (Product Rule):** 75×65 = **4875**

**Project lists of 23,15,19 (Sum Rule):** 23+15+19 = **57**

**Auditorium chairs: letter + number(1-100) (Product Rule):** 26×100 = **2600**

**Bit strings of length 7:** 2⁷ = **128**

**License plates, 3 letters + 3 digits:** 26×26×26×10×10×10 = **17,576,000**

**License plates, 3 digits + 3 letters:** 10×10×10×26×26×26 = **17,576,000**

**License plates, 2 letters + 4 digits (practice):** 26²×10⁴ = 676×10000 = **6,760,000**

**32 microcomputers × 24 ports each:** 32×24 = **768 ports**

**MCQ test, 10 questions, 4 options each:**
- Every question answered: 4¹⁰ = **1,048,576**
- Student may leave blank (5 options each): 5¹⁰ = **9,765,625**

### Solved: License plates start/end constraint (already partly shown)
How many license plates of 4-digit numbers start with 2 or end with 2:
Start with 2: 2___= 10³=1000. End with 2: ___2 = 10³=1000. Both (2__2): 10²=100.
Total = 1000+1000−100 = **1900**

### Solved: Photographer wedding problem (slide 168–169)
6 people chosen from 10 (bride & groom among the 10), arranged in a row:
- **Bride must be in picture:** Bride placed in 1 of 6 positions (6 ways), remaining 5 seats filled from other 9 people: 6 × (9×8×7×6×5) = 6×15120 = **90,720**
- **Both bride & groom must be in picture:** Choose positions for both (6×5 ways to place two specific people in 6 slots) × arrange remaining 4 from 8 people: 6×5×(8×7×6×5) = 30×1680 = **50,400**
- **Exactly one of bride/groom in picture:** Choose which one (2 ways) × their position (6 ways) × fill remaining 5 seats from remaining 8 people (not the other of bride/groom): 2×6×(8×7×6×5×4) = 12×6720 = **80,640**

### Solved: Repetition-permitted number problems (slide 189)
Digits available: 2,3,4,5,7,9 (6 digits). Forming 3-digit numbers, repetition allowed.
- (i) Total 3-digit numbers: 6×6×6 = **216**
- (ii) Less than 400 (first digit must be 2 or 3): 2×6×6 = **72**
- (iii) Even (last digit even: only 2,4 available): 6×6×2 = **72**
- (iv) Odd (last digit odd: 3,5,7,9): 6×6×4 = **144**
- (v) Multiple of 5 (last digit=5, only option): 6×6×1 = **36**
- (vi) Multiple of 10 (last digit=0, not available): **0**

License plates: 3 letters + 4 digits.
- (i) Repetition allowed for both: 26³×10⁴ = 17576×10000 = **175,760,000**
- (ii) Only letters repeated (digits all distinct): 26³×(10×9×8×7) = 17576×5040 = **88,583,040**
- (iii) Only digits repeated (letters all distinct): (26×25×24)×10⁴ = 15600×10000 = **156,000,000**

### Solved: Practice permutations (slide 190)
- **4-letter words from LOGARITHMS (10 distinct letters), no repetition:** P(10,4) = 10×9×8×7 = **5040**
- **Permutations of ENGINEERING (letters: E=3,N=3,G=2,I=2,R=1, total 11):**
  11!/(3!·3!·2!·2!·1!) = 39,916,800/(6×6×2×2) = 39,916,800/144 = **277,200**
- **3 distinct letters from MAST (4 distinct letters):** P(4,3) = 4×3×2 = **24**

### Solved: Block Method examples (slide 191–193, verifying given answers)
- **A,B,C,D,E: A,B,C always together:** treat ABC as 1 block → 3! (block+D+E) × 3! (internal arrangement) = 6×6 = **36**
- **4 boys + 3 girls, girls always together:** 5! (block+4 boys) × 3! (internal) = 120×6 = **720**
- **MISSISSIPPI, all 4 S's together:** treat SSSS as block X → remaining letters with X: {X,M,I,I,I,I,P,P} = 8 units, I repeats 4×, P repeats 2×
  8!/(4!·2!) = 40320/48 = **840**

### Solved: No-two-vowels-together (PERMUTATION) (slide 194)
Word: PERMUTATION (vowels E,U,A,I,O = 5 vowels; consonants P,R,M,T,T,N = 6 letters, T repeats twice)
Arrange 6 consonants first: 6!/2! = 360 ways, creating 7 gaps.
Place 5 vowels into 7 gaps (no repeats among vowels, order matters): P(7,5) = 7×6×5×4×3 = 2520
**Total = 360 × 2520 = 907,200**

### Solved: 5 girls + 2 boys, boys not together (slide 195)
Arrange 5 girls: 5! = 120 ways, creating 6 gaps; place 2 boys in 2 of 6 gaps (order matters): P(6,2) = 30
**Total = 120 × 30 = 3600**

### Solved: Combinations practice (slide 217)
- **Select 6 balls out of 10:** C(10,6) = 10!/(6!4!) = **210**
- **Committee of 10 from 8 boys + 6 girls:**
  - (i) Same number of boys & girls (5 each, since total=10, 5+5): C(8,5)×C(6,5) = 56×6 = **336**
  - (ii) At least 3 girls (girls=3,4,5,6 with boys=7,6,5,4 respectively):
    C(6,3)C(8,7) + C(6,4)C(8,6) + C(6,5)C(8,5) + C(6,6)C(8,4)
    = 20×8 + 15×28 + 6×56 + 1×70 = 160+420+336+70 = **986**

### Solved: Gap method + plates + ASSASSINATION (slide 219)
- **6 women + 5 men in a row, no two men together (Gap Method):**
  Arrange 6 women: 6! = 720 ways → creates 7 gaps; place 5 men into gaps: P(7,5) = 2520
  **Total = 720 × 2520 = 1,814,400**
- **Automobile plates: 2 different letters + 3 different digits, first digit ≠ 0:**
  26×25×9×9×8 = 650×648 = **421,200**
- **Permutations of ASSASSINATION (letters: A=3,S=4,I=2,N=2,T=1,O=1, total=13):**
  13!/(3!·4!·2!·2!) = 6,227,020,800/(6×24×2×2) = 6,227,020,800/576 = **10,810,800**

### Solved: Bit strings & seating (slide 222)
- **Bit strings length 8, start with 0 OR end with 11:** 2⁷+2⁶−2⁵ = 128+64−32 = **160**
- **6 boys + 2 girls in a row:**
  - (i) 2 girls together (block method): treat girls as 1 block → 7 units → 7! × 2! (internal) = 5040×2 = **10,080**
  - (ii) 2 girls NOT together: Total arrangements (8!) − girls together (10,080) = 40,320−10,080 = **30,240**

---

## Quick Revision Summary
- **Unit I** = Foundations: Sets → Set Operations → PIE counting → Propositional Logic → Logical laws → Normal Forms → Predicates/Quantifiers → Proof techniques → Induction.
- **Unit II** = Structures built on sets: Relations → Properties (RSAT) → Equivalence Relations/Partitions → Closures (reflexive/symmetric/transitive via Warshall) → Posets/Hasse Diagrams → Counting (Permutations & Combinations).
