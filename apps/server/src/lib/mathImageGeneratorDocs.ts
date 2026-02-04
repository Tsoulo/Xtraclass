export const MATH_IMAGE_GENERATOR_DOCUMENTATION = `
# Math Image Generator Documentation

The Math Image Generator creates mathematical diagrams using Python/matplotlib. 
When analyzing a reference image, identify the most appropriate image type and parameters.

## Available Image Types and Parameters

### 1. GRAPHS

#### linear
Description: Linear graph y = mx + c
Parameters:
- m (number): Gradient/slope, default 1
- c (number): Y-intercept, default 0
- xMin (number): Minimum x value, default -10
- xMax (number): Maximum x value, default 10
- showGrid (boolean): Show grid lines, default true
- color (string): Line color, default "blue"

#### quadratic
Description: Quadratic graph y = ax² + bx + c
Parameters:
- a (number): Coefficient of x², default 1
- b (number): Coefficient of x, default 0
- c (number): Constant term, default 0
- xMin (number): Minimum x value, default -10
- xMax (number): Maximum x value, default 10
- showGrid (boolean): Show grid lines, default true
- color (string): Line color, default "blue"

#### trig
Description: Trigonometric graphs (sin, cos, tan)
Parameters:
- function (string): "sin", "cos", or "tan", default "sin"
- amplitude (number): Amplitude, default 1
- period (number): Period, default 2π
- phase (number): Phase shift, default 0
- verticalShift (number): Vertical shift, default 0
- xMin (number): Minimum x value, default -2π
- xMax (number): Maximum x value, default 2π
- showGrid (boolean): Show grid lines, default true
- color (string): Line color, default "blue"

#### exponential
Description: Exponential graph y = a × b^x + c
Parameters:
- a (number): Coefficient, default 1
- base (number): Base value, default e (2.718)
- c (number): Vertical shift, default 0
- xMin (number): Minimum x value, default -5
- xMax (number): Maximum x value, default 5
- showGrid (boolean): Show grid lines, default true
- color (string): Line color, default "blue"

#### logarithm
Description: Logarithmic graph y = a × log_b(x) + c
Parameters:
- a (number): Coefficient, default 1
- base (number): Log base, default e (2.718)
- c (number): Vertical shift, default 0
- xMin (number): Minimum x value, default 0.1
- xMax (number): Maximum x value, default 10
- showGrid (boolean): Show grid lines, default true
- color (string): Line color, default "blue"

#### hyperbola
Description: Hyperbola y = a/x + c
Parameters:
- a (number): Coefficient, default 1
- c (number): Vertical shift, default 0
- xMin (number): Minimum x value, default -10
- xMax (number): Maximum x value, default 10
- showGrid (boolean): Show grid lines, default true
- color (string): Line color, default "blue"

### 2. GEOMETRY (2D)

#### triangle
Description: Triangle with labels and measurements
Parameters:
- points (array): Array of [x,y] coordinates for vertices, e.g. [[0,0], [4,0], [2,3]]
- labels (array): Vertex labels, e.g. ["A", "B", "C"]
- showAngles (boolean): Show angle measurements, default false
- showSides (boolean): Show side lengths, default false
- color (string): Outline color, default "blue"
- fill (boolean): Fill the shape, default false
- fillColor (string): Fill color, default "lightblue"

#### circle
Description: Circle with center and radius
Parameters:
- center (array): [x, y] coordinates, default [0, 0]
- radius (number): Circle radius, default 3
- showCenter (boolean): Show center point, default true
- showRadius (boolean): Show radius line with label, default true
- showDiameter (boolean): Show diameter line, default false
- color (string): Outline color, default "blue"
- fill (boolean): Fill the circle, default false

#### rectangle
Description: Rectangle with labels
Parameters:
- origin (array): [x, y] bottom-left corner, default [0, 0]
- width (number): Rectangle width, default 6
- height (number): Rectangle height, default 4
- labels (array): Corner labels, e.g. ["A", "B", "C", "D"]
- showDimensions (boolean): Show width/height labels, default true
- color (string): Outline color, default "blue"
- fill (boolean): Fill the shape, default false

#### angle
Description: Angle with arc and measurement
Parameters:
- vertex (array): [x, y] vertex position, default [0, 0]
- angle1 (number): Start angle in degrees, default 0
- angle2 (number): End angle in degrees, default 45
- rayLength (number): Length of angle rays, default 5
- showArc (boolean): Show angle arc, default true
- showMeasurement (boolean): Show angle degree, default true
- label (string): Label for vertex point

#### parallelLines
Description: Parallel lines with transversal and angle markers
Parameters:
- spacing (number): Distance between parallel lines, default 3
- transversalAngle (number): Angle of transversal in degrees, default 60
- showAngles (boolean): Show angle markers, default true
- showLabels (boolean): Show line labels, default true
- lineColor (string): Color of parallel lines, default "blue"
- transversalColor (string): Color of transversal, default "red"

### 3. 3D SHAPES

#### cylinder
Description: 3D cylinder visualization
Parameters:
- radius (number): Base radius, default 2
- height (number): Cylinder height, default 4
- showLabels (boolean): Show dimensions, default true
- color (string): Surface color, default "steelblue"
- alpha (number): Transparency (0-1), default 0.6

#### cube
Description: 3D cube/rectangular prism
Parameters:
- length (number): Length dimension, default 3
- width (number): Width dimension, default 3
- height (number): Height dimension, default 3
- showLabels (boolean): Show dimensions, default true
- color (string): Surface color, default "steelblue"
- alpha (number): Transparency (0-1), default 0.6

#### cone
Description: 3D cone visualization
Parameters:
- radius (number): Base radius, default 2
- height (number): Cone height, default 4
- showLabels (boolean): Show dimensions, default true
- color (string): Surface color, default "steelblue"

#### pyramid
Description: 3D square pyramid
Parameters:
- baseSize (number): Base side length, default 4
- height (number): Pyramid height, default 5
- showLabels (boolean): Show dimensions, default true
- color (string): Surface color, default "steelblue"

#### sphere
Description: 3D sphere visualization
Parameters:
- radius (number): Sphere radius, default 3
- showLabels (boolean): Show radius label, default true
- color (string): Surface color, default "steelblue"

### 4. NUMBER & COORDINATE

#### numberLine
Description: Number line with marked points
Parameters:
- start (number): Line start value, default -10
- end (number): Line end value, default 10
- markedPoints (array): Points to mark, e.g. [{value: 3, label: "A", color: "red"}]
- showIntegers (boolean): Show integer tick marks, default true
- title (string): Title for the diagram

#### coordinatePlane
Description: Coordinate plane with plotted points
Parameters:
- points (array): Points to plot, e.g. [{x: 2, y: 3, label: "A", color: "red"}]
- xRange (array): [min, max] for x-axis, default [-10, 10]
- yRange (array): [min, max] for y-axis, default [-10, 10]
- showGrid (boolean): Show grid lines, default true
- connectPoints (boolean): Connect points with lines, default false
- title (string): Title for the diagram

### 5. SPECIAL VISUALS

#### pie
Description: Pie chart for fractions/percentages
Parameters:
- values (array): Numeric values, e.g. [30, 20, 50]
- labels (array): Labels for each segment, e.g. ["A", "B", "C"]
- title (string): Chart title, default "Fractions"
- showPercentages (boolean): Show percentage labels, default true

#### bar
Description: Bar chart for data
Parameters:
- values (array): Numeric values, e.g. [4, 7, 2, 5]
- labels (array): Category labels, e.g. ["A", "B", "C", "D"]
- title (string): Chart title, default "Data"
- xLabel (string): X-axis label
- yLabel (string): Y-axis label
- color (string): Bar color, default "steelblue"

#### venn
Description: Venn diagram (2 or 3 sets)
Parameters:
- sets (number): Number of sets (2 or 3), default 2
- labels (array): Set labels, e.g. ["A", "B"] or ["A", "B", "C"]
- title (string): Diagram title, default "Venn Diagram"
- showLabels (boolean): Show set labels, default true

#### fraction
Description: Visual representation of a fraction
Parameters:
- numerator (number): Numerator value, e.g. 3
- denominator (number): Denominator value, e.g. 4
- shape (string): "circle" or "rectangle", default "circle"
- title (string): Custom title, defaults to "3/4"

#### transformation
Description: Geometric transformation visualization
Parameters:
- originalPoints (array): Original shape vertices, e.g. [[0,0], [2,0], [2,2], [0,2]]
- transformation (string): "translate", "rotate", "reflect", or "scale"
- transformParams (object): Transformation-specific parameters:
  - For translate: {dx: 3, dy: 2}
  - For rotate: {angle: 90, center: [0,0]}
  - For reflect: {axis: "x"} or {axis: "y"} or {axis: "y=x"}
  - For scale: {factor: 2, center: [0,0]}
- showOriginal (boolean): Show original shape, default true

### 6. ADVANCED GEOMETRY (Grade 10-12)

#### cyclicQuadrilateral
Description: Quadrilateral inscribed in a circle with properties
Parameters:
- radius (number): Circle radius, default 3
- showAngles (boolean): Mark opposite angles, default true
- showDiagonals (boolean): Show diagonals, default false

#### tangentSecant
Description: Circle with tangent and secant lines
Parameters:
- radius (number): Circle radius, default 3
- tangentPoint (number): Angle for tangent point in degrees, default 45
- secantAngles (array): [angle1, angle2] for secant chord points

#### bearing
Description: Bearings and directions diagram
Parameters:
- bearing (number): Bearing in degrees (0-360), default 45
- distance (number): Distance to show, default 5
- showCompass (boolean): Show compass directions, default true

#### vector
Description: Vector diagram with components
Parameters:
- vectors (array): Array of vector objects, e.g. [{start: [0,0], end: [3,4], label: "v", color: "blue"}]
- showComponents (boolean): Show x,y components, default true
- showResultant (boolean): Show resultant vector, default false

#### similarityCongruence
Description: Similar or congruent shapes comparison
Parameters:
- type (string): "similar" or "congruent"
- shape (string): "triangle" or "rectangle"
- scaleFactor (number): Scale factor for similar shapes, default 1.5
- showMarkings (boolean): Show congruence markings, default true

#### circleTheorem
Description: Circle theorem illustrations
Parameters:
- theorem (string): One of: "central_inscribed", "tangent_radius", "inscribed_angle", "tangent_chord", "cyclic_quadrilateral", "chord_bisector", "equal_chords"
- radius (number): Circle radius, default 3
- showLabels (boolean): Show labels, default true
- showMeasurements (boolean): Show angle measurements, default true

#### proofDiagram
Description: Proof diagrams for geometry theorems
Parameters:
- proofType (string): One of: "pythagoras", "midpoint", "isosceles", "exterior_angle"
- showLabels (boolean): Show labels, default true
- showMarkings (boolean): Show equal markings, default true

## Response Format

Return a JSON object with:
{
  "question": "The question text for the student",
  "answer": "The correct answer",
  "marks": number (1-10),
  "imageType": "one of the type names above",
  "imageParams": { parameters matching the selected type }
}

## Important Notes
1. Match the image type to what you see in the reference image
2. Use realistic parameter values based on what's visible
3. Create questions appropriate for the selected grade level and topic
4. Ensure the generated image will closely match the reference
`;
