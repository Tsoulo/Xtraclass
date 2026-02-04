#!/usr/bin/env python3
"""
Comprehensive Math Image Generator for XtraClass.ai
Generates various mathematical visualizations using matplotlib and numpy.
Supports: graphs, geometric shapes, coordinate geometry, number lines, angles, etc.
"""

import sys
import json
import os
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import Arc, FancyArrowPatch, Polygon, Circle, Rectangle, Wedge
from matplotlib.lines import Line2D
import uuid
from datetime import datetime

OUTPUT_DIR = "uploads/generated-graphs"

def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_filename():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    return f"math_image_{timestamp}_{unique_id}.png"

def setup_figure(figsize=(8, 6), dpi=150):
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
    return fig, ax

def save_figure(fig, filename):
    filepath = os.path.join(OUTPUT_DIR, filename)
    fig.savefig(filepath, bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close(fig)
    return filepath

# ==================== GRAPH FUNCTIONS ====================

def generate_linear_graph(params):
    """Generate linear graph y = mx + c"""
    m = params.get('m', 1)
    c = params.get('c', 0)
    x_min = params.get('xMin', -10)
    x_max = params.get('xMax', 10)
    show_grid = params.get('showGrid', True)
    show_axes = params.get('showAxes', True)
    color = params.get('color', 'blue')
    
    fig, ax = setup_figure()
    x = np.linspace(x_min, x_max, 400)
    y = m * x + c
    
    ax.plot(x, y, color=color, linewidth=2, label=f'y = {m}x + {c}')
    
    if show_axes:
        ax.axhline(y=0, color='black', linewidth=0.5)
        ax.axvline(x=0, color='black', linewidth=0.5)
    
    if show_grid:
        ax.grid(True, alpha=0.3)
    
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    ax.legend()
    ax.set_xlim(x_min, x_max)
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_quadratic_graph(params):
    """Generate quadratic graph y = ax² + bx + c"""
    a = params.get('a', 1)
    b = params.get('b', 0)
    c = params.get('c', 0)
    x_min = params.get('xMin', -10)
    x_max = params.get('xMax', 10)
    show_grid = params.get('showGrid', True)
    color = params.get('color', 'blue')
    
    fig, ax = setup_figure()
    x = np.linspace(x_min, x_max, 400)
    y = a * x**2 + b * x + c
    
    label = f'y = {a}x² + {b}x + {c}'
    ax.plot(x, y, color=color, linewidth=2, label=label)
    
    ax.axhline(y=0, color='black', linewidth=0.5)
    ax.axvline(x=0, color='black', linewidth=0.5)
    
    if show_grid:
        ax.grid(True, alpha=0.3)
    
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    ax.legend()
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_polynomial_graph(params):
    """Generate polynomial graph from coefficients"""
    coefficients = params.get('coefficients', [1, 0, 0])  # Default x²
    x_min = params.get('xMin', -10)
    x_max = params.get('xMax', 10)
    show_grid = params.get('showGrid', True)
    color = params.get('color', 'blue')
    
    fig, ax = setup_figure()
    x = np.linspace(x_min, x_max, 400)
    y = np.polyval(coefficients, x)
    
    ax.plot(x, y, color=color, linewidth=2)
    
    ax.axhline(y=0, color='black', linewidth=0.5)
    ax.axvline(x=0, color='black', linewidth=0.5)
    
    if show_grid:
        ax.grid(True, alpha=0.3)
    
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_trig_graph(params):
    """Generate trigonometric graphs (sin, cos, tan)"""
    func = params.get('function', 'sin')
    amplitude = params.get('amplitude', 1)
    period = params.get('period', 2 * np.pi)
    phase = params.get('phase', 0)
    vertical_shift = params.get('verticalShift', 0)
    x_min = params.get('xMin', -2 * np.pi)
    x_max = params.get('xMax', 2 * np.pi)
    show_grid = params.get('showGrid', True)
    color = params.get('color', 'blue')
    
    fig, ax = setup_figure()
    x = np.linspace(x_min, x_max, 1000)
    
    b = 2 * np.pi / period
    
    if func == 'sin':
        y = amplitude * np.sin(b * x + phase) + vertical_shift
        label = f'y = {amplitude}sin({b:.2f}x + {phase:.2f}) + {vertical_shift}'
    elif func == 'cos':
        y = amplitude * np.cos(b * x + phase) + vertical_shift
        label = f'y = {amplitude}cos({b:.2f}x + {phase:.2f}) + {vertical_shift}'
    elif func == 'tan':
        y = amplitude * np.tan(b * x + phase) + vertical_shift
        y = np.where(np.abs(y) > 10, np.nan, y)
        label = f'y = {amplitude}tan({b:.2f}x + {phase:.2f}) + {vertical_shift}'
    else:
        y = np.sin(x)
        label = 'y = sin(x)'
    
    ax.plot(x, y, color=color, linewidth=2, label=label)
    
    ax.axhline(y=0, color='black', linewidth=0.5)
    ax.axvline(x=0, color='black', linewidth=0.5)
    
    if show_grid:
        ax.grid(True, alpha=0.3)
    
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    ax.legend()
    ax.set_ylim(-10, 10)
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_exponential_graph(params):
    """Generate exponential graph y = a * b^x + c"""
    a = params.get('a', 1)
    b = params.get('base', np.e)
    c = params.get('c', 0)
    x_min = params.get('xMin', -5)
    x_max = params.get('xMax', 5)
    show_grid = params.get('showGrid', True)
    color = params.get('color', 'blue')
    
    fig, ax = setup_figure()
    x = np.linspace(x_min, x_max, 400)
    y = a * (b ** x) + c
    
    ax.plot(x, y, color=color, linewidth=2, label=f'y = {a} × {b:.2f}^x + {c}')
    
    ax.axhline(y=0, color='black', linewidth=0.5)
    ax.axvline(x=0, color='black', linewidth=0.5)
    
    if show_grid:
        ax.grid(True, alpha=0.3)
    
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    ax.legend()
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_logarithm_graph(params):
    """Generate logarithmic graph y = a * log_b(x) + c"""
    a = params.get('a', 1)
    base = params.get('base', np.e)
    c = params.get('c', 0)
    x_min = params.get('xMin', 0.1)
    x_max = params.get('xMax', 10)
    show_grid = params.get('showGrid', True)
    color = params.get('color', 'blue')
    
    fig, ax = setup_figure()
    x = np.linspace(x_min, x_max, 400)
    y = a * np.log(x) / np.log(base) + c
    
    ax.plot(x, y, color=color, linewidth=2, label=f'y = {a} × log_{base:.2f}(x) + {c}')
    
    ax.axhline(y=0, color='black', linewidth=0.5)
    ax.axvline(x=0, color='black', linewidth=0.5)
    
    if show_grid:
        ax.grid(True, alpha=0.3)
    
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    ax.legend()
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_hyperbola_graph(params):
    """Generate hyperbola y = a/x + c"""
    a = params.get('a', 1)
    c = params.get('c', 0)
    x_min = params.get('xMin', -10)
    x_max = params.get('xMax', 10)
    show_grid = params.get('showGrid', True)
    color = params.get('color', 'blue')
    
    fig, ax = setup_figure()
    
    x_neg = np.linspace(x_min, -0.1, 200)
    x_pos = np.linspace(0.1, x_max, 200)
    
    y_neg = a / x_neg + c
    y_pos = a / x_pos + c
    
    ax.plot(x_neg, y_neg, color=color, linewidth=2, label=f'y = {a}/x + {c}')
    ax.plot(x_pos, y_pos, color=color, linewidth=2)
    
    ax.axhline(y=0, color='black', linewidth=0.5)
    ax.axvline(x=0, color='black', linewidth=0.5)
    
    if show_grid:
        ax.grid(True, alpha=0.3)
    
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    ax.legend()
    ax.set_ylim(-10, 10)
    
    filename = generate_filename()
    return save_figure(fig, filename)

# ==================== GEOMETRY FUNCTIONS ====================

def generate_triangle(params):
    """Generate a triangle with optional labels and measurements"""
    points = params.get('points', [[0, 0], [4, 0], [2, 3]])
    labels = params.get('labels', ['A', 'B', 'C'])
    show_angles = params.get('showAngles', False)
    show_sides = params.get('showSides', False)
    color = params.get('color', 'blue')
    fill = params.get('fill', False)
    fill_color = params.get('fillColor', 'lightblue')
    
    fig, ax = setup_figure()
    
    points = np.array(points)
    triangle = Polygon(points, fill=fill, facecolor=fill_color if fill else 'none', 
                       edgecolor=color, linewidth=2)
    ax.add_patch(triangle)
    
    for i, (point, label) in enumerate(zip(points, labels)):
        offset = 0.3
        ax.annotate(label, point, fontsize=12, ha='center', va='center',
                   xytext=(offset * np.sign(point[0] - np.mean(points[:, 0])),
                          offset * np.sign(point[1] - np.mean(points[:, 1]))),
                   textcoords='offset points')
    
    if show_sides:
        for i in range(3):
            p1, p2 = points[i], points[(i + 1) % 3]
            mid = (p1 + p2) / 2
            length = np.sqrt(np.sum((p2 - p1) ** 2))
            ax.annotate(f'{length:.2f}', mid, fontsize=10, ha='center', va='bottom',
                       color='gray')
    
    ax.set_aspect('equal')
    ax.autoscale()
    ax.grid(True, alpha=0.3)
    ax.axhline(y=0, color='black', linewidth=0.5)
    ax.axvline(x=0, color='black', linewidth=0.5)
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_circle(params):
    """Generate a circle with optional center, radius labels"""
    center = params.get('center', [0, 0])
    radius = params.get('radius', 3)
    show_center = params.get('showCenter', True)
    show_radius = params.get('showRadius', True)
    show_diameter = params.get('showDiameter', False)
    color = params.get('color', 'blue')
    fill = params.get('fill', False)
    fill_color = params.get('fillColor', 'lightblue')
    
    fig, ax = setup_figure()
    
    circle = Circle(center, radius, fill=fill, facecolor=fill_color if fill else 'none',
                   edgecolor=color, linewidth=2)
    ax.add_patch(circle)
    
    if show_center:
        ax.plot(center[0], center[1], 'ko', markersize=5)
        ax.annotate('O', center, fontsize=12, ha='left', va='bottom', xytext=(5, 5),
                   textcoords='offset points')
    
    if show_radius:
        ax.plot([center[0], center[0] + radius], [center[1], center[1]], 
                color='red', linewidth=1.5, linestyle='--')
        ax.annotate(f'r = {radius}', [center[0] + radius/2, center[1]], 
                   fontsize=10, ha='center', va='bottom', color='red')
    
    if show_diameter:
        ax.plot([center[0] - radius, center[0] + radius], [center[1], center[1]], 
                color='green', linewidth=1.5, linestyle='--')
        ax.annotate(f'd = {2*radius}', [center[0], center[1] - 0.3], 
                   fontsize=10, ha='center', va='top', color='green')
    
    ax.set_aspect('equal')
    margin = radius * 0.5
    ax.set_xlim(center[0] - radius - margin, center[0] + radius + margin)
    ax.set_ylim(center[1] - radius - margin, center[1] + radius + margin)
    ax.grid(True, alpha=0.3)
    ax.axhline(y=0, color='black', linewidth=0.5)
    ax.axvline(x=0, color='black', linewidth=0.5)
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_rectangle(params):
    """Generate a rectangle with optional labels"""
    origin = params.get('origin', [0, 0])
    width = params.get('width', 6)
    height = params.get('height', 4)
    labels = params.get('labels', ['A', 'B', 'C', 'D'])
    show_dimensions = params.get('showDimensions', True)
    color = params.get('color', 'blue')
    fill = params.get('fill', False)
    fill_color = params.get('fillColor', 'lightblue')
    
    fig, ax = setup_figure()
    
    rect = Rectangle(origin, width, height, fill=fill, 
                    facecolor=fill_color if fill else 'none',
                    edgecolor=color, linewidth=2)
    ax.add_patch(rect)
    
    corners = [
        origin,
        [origin[0] + width, origin[1]],
        [origin[0] + width, origin[1] + height],
        [origin[0], origin[1] + height]
    ]
    
    for corner, label in zip(corners, labels):
        ax.annotate(label, corner, fontsize=12, ha='center', va='center',
                   xytext=(5, 5), textcoords='offset points')
    
    if show_dimensions:
        ax.annotate(f'{width}', [origin[0] + width/2, origin[1] - 0.3], 
                   fontsize=10, ha='center', va='top', color='gray')
        ax.annotate(f'{height}', [origin[0] - 0.3, origin[1] + height/2], 
                   fontsize=10, ha='right', va='center', color='gray', rotation=90)
    
    ax.set_aspect('equal')
    ax.autoscale()
    ax.grid(True, alpha=0.3)
    ax.axhline(y=0, color='black', linewidth=0.5)
    ax.axvline(x=0, color='black', linewidth=0.5)
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_polygon(params):
    """Generate any polygon from list of points"""
    points = params.get('points', [[0, 0], [3, 0], [4, 2], [2, 4], [0, 2]])
    labels = params.get('labels', [])
    color = params.get('color', 'blue')
    fill = params.get('fill', False)
    fill_color = params.get('fillColor', 'lightblue')
    
    fig, ax = setup_figure()
    
    points = np.array(points)
    polygon = Polygon(points, fill=fill, facecolor=fill_color if fill else 'none',
                     edgecolor=color, linewidth=2)
    ax.add_patch(polygon)
    
    if labels:
        for point, label in zip(points, labels):
            ax.annotate(label, point, fontsize=12, ha='center', va='center',
                       xytext=(5, 5), textcoords='offset points')
    
    ax.set_aspect('equal')
    ax.autoscale()
    ax.grid(True, alpha=0.3)
    ax.axhline(y=0, color='black', linewidth=0.5)
    ax.axvline(x=0, color='black', linewidth=0.5)
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_angle(params):
    """Generate an angle with arc and measurement"""
    vertex = params.get('vertex', [0, 0])
    angle1 = params.get('angle1', 0)  # degrees
    angle2 = params.get('angle2', 45)  # degrees
    ray_length = params.get('rayLength', 5)
    show_arc = params.get('showArc', True)
    show_measurement = params.get('showMeasurement', True)
    label = params.get('label', '')
    color = params.get('color', 'blue')
    
    fig, ax = setup_figure()
    
    rad1 = np.radians(angle1)
    rad2 = np.radians(angle2)
    
    end1 = [vertex[0] + ray_length * np.cos(rad1), vertex[1] + ray_length * np.sin(rad1)]
    end2 = [vertex[0] + ray_length * np.cos(rad2), vertex[1] + ray_length * np.sin(rad2)]
    
    ax.plot([vertex[0], end1[0]], [vertex[1], end1[1]], color=color, linewidth=2)
    ax.plot([vertex[0], end2[0]], [vertex[1], end2[1]], color=color, linewidth=2)
    
    if show_arc:
        arc = Arc(vertex, ray_length * 0.4, ray_length * 0.4, 
                 angle=0, theta1=angle1, theta2=angle2, color='red', linewidth=1.5)
        ax.add_patch(arc)
    
    if show_measurement:
        mid_angle = np.radians((angle1 + angle2) / 2)
        label_pos = [vertex[0] + ray_length * 0.3 * np.cos(mid_angle),
                    vertex[1] + ray_length * 0.3 * np.sin(mid_angle)]
        angle_size = abs(angle2 - angle1)
        ax.annotate(f'{angle_size}°', label_pos, fontsize=10, ha='center', va='center', color='red')
    
    if label:
        ax.annotate(label, vertex, fontsize=12, ha='right', va='top',
                   xytext=(-5, -5), textcoords='offset points')
    
    ax.set_aspect('equal')
    ax.autoscale()
    ax.grid(True, alpha=0.3)
    ax.axhline(y=0, color='black', linewidth=0.5)
    ax.axvline(x=0, color='black', linewidth=0.5)
    
    filename = generate_filename()
    return save_figure(fig, filename)

# ==================== NUMBER LINE & COORDINATE ====================

def generate_number_line(params):
    """Generate a number line with marked points"""
    start = params.get('start', -10)
    end = params.get('end', 10)
    marked_points = params.get('markedPoints', [])
    show_integers = params.get('showIntegers', True)
    title = params.get('title', '')
    
    fig, ax = setup_figure(figsize=(10, 2))
    
    ax.arrow(start - 0.5, 0, end - start + 1.5, 0, head_width=0.1, head_length=0.2, fc='black', ec='black')
    
    if show_integers:
        for i in range(int(start), int(end) + 1):
            ax.plot([i, i], [-0.1, 0.1], 'k-', linewidth=1)
            ax.annotate(str(i), [i, -0.25], fontsize=9, ha='center', va='top')
    
    for point in marked_points:
        value = point.get('value', 0)
        label = point.get('label', '')
        color = point.get('color', 'red')
        ax.plot(value, 0, 'o', color=color, markersize=10)
        if label:
            ax.annotate(label, [value, 0.3], fontsize=10, ha='center', va='bottom', color=color)
    
    if title:
        ax.set_title(title, fontsize=12)
    
    ax.set_xlim(start - 1, end + 1)
    ax.set_ylim(-0.8, 0.8)
    ax.axis('off')
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_coordinate_plane(params):
    """Generate a coordinate plane with plotted points"""
    points = params.get('points', [])
    x_range = params.get('xRange', [-10, 10])
    y_range = params.get('yRange', [-10, 10])
    show_grid = params.get('showGrid', True)
    title = params.get('title', '')
    connect_points = params.get('connectPoints', False)
    
    fig, ax = setup_figure()
    
    ax.axhline(y=0, color='black', linewidth=1)
    ax.axvline(x=0, color='black', linewidth=1)
    
    if show_grid:
        ax.grid(True, alpha=0.3)
    
    if points:
        x_coords = []
        y_coords = []
        for point in points:
            x, y = point.get('x', 0), point.get('y', 0)
            label = point.get('label', '')
            color = point.get('color', 'red')
            
            x_coords.append(x)
            y_coords.append(y)
            
            ax.plot(x, y, 'o', color=color, markersize=8)
            if label:
                ax.annotate(f'{label}({x},{y})', [x, y], fontsize=9, ha='left', va='bottom',
                           xytext=(5, 5), textcoords='offset points', color=color)
        
        if connect_points and len(x_coords) > 1:
            ax.plot(x_coords + [x_coords[0]], y_coords + [y_coords[0]], 'b-', linewidth=1.5, alpha=0.7)
    
    ax.set_xlim(x_range)
    ax.set_ylim(y_range)
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    
    if title:
        ax.set_title(title, fontsize=12)
    
    filename = generate_filename()
    return save_figure(fig, filename)

# ==================== SPECIAL MATH VISUALS ====================

def generate_pie_chart(params):
    """Generate pie chart for fractions"""
    values = params.get('values', [1, 2, 3])
    labels = params.get('labels', [])
    colors = params.get('colors', None)
    title = params.get('title', 'Fractions')
    show_percentages = params.get('showPercentages', True)
    
    fig, ax = setup_figure()
    
    if not labels:
        labels = [f'Part {i+1}' for i in range(len(values))]
    
    autopct = '%1.1f%%' if show_percentages else ''
    
    ax.pie(values, labels=labels, colors=colors, autopct=autopct, startangle=90)
    ax.set_title(title, fontsize=12)
    ax.axis('equal')
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_bar_chart(params):
    """Generate bar chart for data"""
    values = params.get('values', [3, 7, 2, 5])
    labels = params.get('labels', [])
    title = params.get('title', 'Data')
    x_label = params.get('xLabel', '')
    y_label = params.get('yLabel', '')
    color = params.get('color', 'steelblue')
    
    fig, ax = setup_figure()
    
    if not labels:
        labels = [f'Item {i+1}' for i in range(len(values))]
    
    ax.bar(labels, values, color=color)
    ax.set_title(title, fontsize=12)
    ax.set_xlabel(x_label)
    ax.set_ylabel(y_label)
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_venn_diagram(params):
    """Generate Venn diagram (2 or 3 sets)"""
    sets = params.get('sets', 2)
    labels = params.get('labels', ['A', 'B', 'C'] if sets == 3 else ['A', 'B'])
    title = params.get('title', 'Venn Diagram')
    show_labels = params.get('showLabels', True)
    
    fig, ax = setup_figure()
    
    if sets == 2:
        circle1 = Circle((-0.5, 0), 1.5, fill=False, edgecolor='blue', linewidth=2)
        circle2 = Circle((0.5, 0), 1.5, fill=False, edgecolor='red', linewidth=2)
        ax.add_patch(circle1)
        ax.add_patch(circle2)
        
        if show_labels:
            ax.annotate(labels[0], (-1.5, 0), fontsize=14, ha='center', va='center')
            ax.annotate(labels[1], (1.5, 0), fontsize=14, ha='center', va='center')
    else:
        circle1 = Circle((-0.5, 0.3), 1.3, fill=False, edgecolor='blue', linewidth=2)
        circle2 = Circle((0.5, 0.3), 1.3, fill=False, edgecolor='red', linewidth=2)
        circle3 = Circle((0, -0.6), 1.3, fill=False, edgecolor='green', linewidth=2)
        ax.add_patch(circle1)
        ax.add_patch(circle2)
        ax.add_patch(circle3)
        
        if show_labels:
            ax.annotate(labels[0], (-1.5, 0.8), fontsize=14, ha='center', va='center')
            ax.annotate(labels[1], (1.5, 0.8), fontsize=14, ha='center', va='center')
            ax.annotate(labels[2], (0, -2), fontsize=14, ha='center', va='center')
    
    ax.set_xlim(-3, 3)
    ax.set_ylim(-3, 3)
    ax.set_aspect('equal')
    ax.axis('off')
    ax.set_title(title, fontsize=12)
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_fraction_visual(params):
    """Generate visual representation of a fraction"""
    numerator = params.get('numerator', 3)
    denominator = params.get('denominator', 4)
    shape = params.get('shape', 'circle')  # circle, rectangle
    title = params.get('title', '')
    
    fig, ax = setup_figure()
    
    if shape == 'circle':
        for i in range(denominator):
            angle1 = i * 360 / denominator
            angle2 = (i + 1) * 360 / denominator
            color = 'steelblue' if i < numerator else 'lightgray'
            wedge = Wedge((0, 0), 2, angle1, angle2, facecolor=color, edgecolor='black', linewidth=1)
            ax.add_patch(wedge)
    else:
        width = 4
        height = 1
        part_width = width / denominator
        for i in range(denominator):
            color = 'steelblue' if i < numerator else 'lightgray'
            rect = Rectangle((i * part_width - width/2, -height/2), part_width, height,
                            facecolor=color, edgecolor='black', linewidth=1)
            ax.add_patch(rect)
    
    if not title:
        title = f'{numerator}/{denominator}'
    
    ax.set_xlim(-3, 3)
    ax.set_ylim(-3, 3)
    ax.set_aspect('equal')
    ax.axis('off')
    ax.set_title(title, fontsize=14)
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_transformation(params):
    """Generate geometric transformation visualization"""
    original_points = params.get('originalPoints', [[0, 0], [2, 0], [2, 2], [0, 2]])
    transformation = params.get('transformation', 'translate')  # translate, rotate, reflect, scale
    transform_params = params.get('transformParams', {})
    show_original = params.get('showOriginal', True)
    
    fig, ax = setup_figure()
    
    original = np.array(original_points)
    
    if transformation == 'translate':
        dx = transform_params.get('dx', 3)
        dy = transform_params.get('dy', 2)
        transformed = original + np.array([dx, dy])
    elif transformation == 'rotate':
        angle = np.radians(transform_params.get('angle', 90))
        center = np.array(transform_params.get('center', [0, 0]))
        rotation_matrix = np.array([[np.cos(angle), -np.sin(angle)],
                                   [np.sin(angle), np.cos(angle)]])
        transformed = np.array([(rotation_matrix @ (p - center)) + center for p in original])
    elif transformation == 'reflect':
        axis = transform_params.get('axis', 'x')  # x, y, or line y=x
        if axis == 'x':
            transformed = original * np.array([1, -1])
        elif axis == 'y':
            transformed = original * np.array([-1, 1])
        else:
            transformed = np.array([[p[1], p[0]] for p in original])
    elif transformation == 'scale':
        factor = transform_params.get('factor', 2)
        center = np.array(transform_params.get('center', [0, 0]))
        transformed = (original - center) * factor + center
    else:
        transformed = original
    
    if show_original:
        original_poly = Polygon(original, fill=True, facecolor='lightblue', 
                               edgecolor='blue', linewidth=2, alpha=0.5)
        ax.add_patch(original_poly)
    
    transformed_poly = Polygon(transformed, fill=True, facecolor='lightcoral',
                              edgecolor='red', linewidth=2, alpha=0.5)
    ax.add_patch(transformed_poly)
    
    ax.set_aspect('equal')
    ax.autoscale()
    ax.grid(True, alpha=0.3)
    ax.axhline(y=0, color='black', linewidth=0.5)
    ax.axvline(x=0, color='black', linewidth=0.5)
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    
    filename = generate_filename()
    return save_figure(fig, filename)

# ==================== 3D SHAPES ====================

def generate_cylinder(params):
    """Generate a 3D cylinder visualization"""
    from mpl_toolkits.mplot3d import Axes3D
    
    radius = params.get('radius', 2)
    height = params.get('height', 4)
    show_labels = params.get('showLabels', True)
    color = params.get('color', 'steelblue')
    alpha = params.get('alpha', 0.6)
    
    fig = plt.figure(figsize=(8, 8), dpi=150)
    ax = fig.add_subplot(111, projection='3d')
    
    # Create cylinder surface
    theta = np.linspace(0, 2 * np.pi, 50)
    z = np.linspace(0, height, 50)
    theta_grid, z_grid = np.meshgrid(theta, z)
    x_grid = radius * np.cos(theta_grid)
    y_grid = radius * np.sin(theta_grid)
    
    ax.plot_surface(x_grid, y_grid, z_grid, alpha=alpha, color=color)
    
    # Draw top and bottom circles
    x_circle = radius * np.cos(theta)
    y_circle = radius * np.sin(theta)
    ax.plot(x_circle, y_circle, 0, color='darkblue', linewidth=2)
    ax.plot(x_circle, y_circle, height, color='darkblue', linewidth=2)
    
    if show_labels:
        ax.text(radius + 0.5, 0, height/2, f'r = {radius}', fontsize=10)
        ax.text(0, 0, height + 0.5, f'h = {height}', fontsize=10, ha='center')
    
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')
    ax.set_title('Cylinder', fontsize=12)
    
    # Equal aspect ratio
    max_range = max(radius, height/2) * 1.5
    ax.set_xlim(-max_range, max_range)
    ax.set_ylim(-max_range, max_range)
    ax.set_zlim(0, height * 1.2)
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_cube(params):
    """Generate a 3D cube/rectangular prism visualization"""
    from mpl_toolkits.mplot3d import Axes3D
    from mpl_toolkits.mplot3d.art3d import Poly3DCollection
    
    length = params.get('length', 3)
    width = params.get('width', 3)
    height = params.get('height', 3)
    show_labels = params.get('showLabels', True)
    color = params.get('color', 'steelblue')
    alpha = params.get('alpha', 0.6)
    
    fig = plt.figure(figsize=(8, 8), dpi=150)
    ax = fig.add_subplot(111, projection='3d')
    
    # Define vertices
    vertices = [
        [0, 0, 0], [length, 0, 0], [length, width, 0], [0, width, 0],
        [0, 0, height], [length, 0, height], [length, width, height], [0, width, height]
    ]
    
    # Define faces
    faces = [
        [vertices[0], vertices[1], vertices[5], vertices[4]],  # front
        [vertices[2], vertices[3], vertices[7], vertices[6]],  # back
        [vertices[0], vertices[3], vertices[7], vertices[4]],  # left
        [vertices[1], vertices[2], vertices[6], vertices[5]],  # right
        [vertices[0], vertices[1], vertices[2], vertices[3]],  # bottom
        [vertices[4], vertices[5], vertices[6], vertices[7]]   # top
    ]
    
    ax.add_collection3d(Poly3DCollection(faces, alpha=alpha, facecolor=color, edgecolor='darkblue', linewidth=1))
    
    if show_labels:
        ax.text(length/2, -0.5, 0, f'l = {length}', fontsize=10, ha='center')
        ax.text(length + 0.5, width/2, 0, f'w = {width}', fontsize=10)
        ax.text(length + 0.5, width, height/2, f'h = {height}', fontsize=10)
    
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')
    ax.set_title('Rectangular Prism' if length != width or width != height else 'Cube', fontsize=12)
    
    max_dim = max(length, width, height) * 1.3
    ax.set_xlim(0, max_dim)
    ax.set_ylim(0, max_dim)
    ax.set_zlim(0, max_dim)
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_cone(params):
    """Generate a 3D cone visualization"""
    from mpl_toolkits.mplot3d import Axes3D
    
    radius = params.get('radius', 2)
    height = params.get('height', 4)
    show_labels = params.get('showLabels', True)
    color = params.get('color', 'steelblue')
    alpha = params.get('alpha', 0.6)
    
    fig = plt.figure(figsize=(8, 8), dpi=150)
    ax = fig.add_subplot(111, projection='3d')
    
    # Create cone surface
    theta = np.linspace(0, 2 * np.pi, 50)
    z = np.linspace(0, height, 50)
    theta_grid, z_grid = np.meshgrid(theta, z)
    r_grid = radius * (1 - z_grid / height)  # radius decreases with height
    x_grid = r_grid * np.cos(theta_grid)
    y_grid = r_grid * np.sin(theta_grid)
    
    ax.plot_surface(x_grid, y_grid, z_grid, alpha=alpha, color=color)
    
    # Draw base circle
    x_circle = radius * np.cos(theta)
    y_circle = radius * np.sin(theta)
    ax.plot(x_circle, y_circle, 0, color='darkblue', linewidth=2)
    
    # Draw slant line
    ax.plot([radius, 0], [0, 0], [0, height], color='darkblue', linewidth=2)
    
    if show_labels:
        ax.text(radius + 0.5, 0, 0, f'r = {radius}', fontsize=10)
        ax.text(0, 0, height + 0.5, f'h = {height}', fontsize=10, ha='center')
    
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')
    ax.set_title('Cone', fontsize=12)
    
    max_range = max(radius, height/2) * 1.5
    ax.set_xlim(-max_range, max_range)
    ax.set_ylim(-max_range, max_range)
    ax.set_zlim(0, height * 1.2)
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_pyramid(params):
    """Generate a 3D pyramid visualization"""
    from mpl_toolkits.mplot3d import Axes3D
    from mpl_toolkits.mplot3d.art3d import Poly3DCollection
    
    base_size = params.get('baseSize', 4)
    height = params.get('height', 5)
    show_labels = params.get('showLabels', True)
    color = params.get('color', 'steelblue')
    alpha = params.get('alpha', 0.6)
    
    fig = plt.figure(figsize=(8, 8), dpi=150)
    ax = fig.add_subplot(111, projection='3d')
    
    # Define vertices (square base pyramid)
    half = base_size / 2
    vertices = [
        [-half, -half, 0], [half, -half, 0], [half, half, 0], [-half, half, 0],
        [0, 0, height]  # apex
    ]
    
    # Define faces
    faces = [
        [vertices[0], vertices[1], vertices[4]],  # front
        [vertices[1], vertices[2], vertices[4]],  # right
        [vertices[2], vertices[3], vertices[4]],  # back
        [vertices[3], vertices[0], vertices[4]],  # left
        [vertices[0], vertices[1], vertices[2], vertices[3]]  # base
    ]
    
    ax.add_collection3d(Poly3DCollection(faces, alpha=alpha, facecolor=color, edgecolor='darkblue', linewidth=1))
    
    if show_labels:
        ax.text(0, -half - 0.5, 0, f'base = {base_size}', fontsize=10, ha='center')
        ax.text(half + 0.5, 0, height/2, f'h = {height}', fontsize=10)
    
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')
    ax.set_title('Pyramid', fontsize=12)
    
    max_dim = max(base_size, height) * 0.8
    ax.set_xlim(-max_dim, max_dim)
    ax.set_ylim(-max_dim, max_dim)
    ax.set_zlim(0, height * 1.2)
    
    filename = generate_filename()
    return save_figure(fig, filename)

def generate_sphere(params):
    """Generate a 3D sphere visualization"""
    from mpl_toolkits.mplot3d import Axes3D
    
    radius = params.get('radius', 3)
    show_labels = params.get('showLabels', True)
    color = params.get('color', 'steelblue')
    alpha = params.get('alpha', 0.6)
    
    fig = plt.figure(figsize=(8, 8), dpi=150)
    ax = fig.add_subplot(111, projection='3d')
    
    # Create sphere surface
    u = np.linspace(0, 2 * np.pi, 50)
    v = np.linspace(0, np.pi, 50)
    x = radius * np.outer(np.cos(u), np.sin(v))
    y = radius * np.outer(np.sin(u), np.sin(v))
    z = radius * np.outer(np.ones(np.size(u)), np.cos(v))
    
    ax.plot_surface(x, y, z, alpha=alpha, color=color)
    
    # Draw equator and prime meridian
    theta = np.linspace(0, 2 * np.pi, 100)
    ax.plot(radius * np.cos(theta), radius * np.sin(theta), 0, color='darkblue', linewidth=1.5)
    ax.plot(radius * np.cos(theta), np.zeros_like(theta), radius * np.sin(theta), color='darkblue', linewidth=1.5)
    
    if show_labels:
        ax.text(radius + 0.5, 0, 0, f'r = {radius}', fontsize=10)
    
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')
    ax.set_title('Sphere', fontsize=12)
    
    ax.set_xlim(-radius*1.3, radius*1.3)
    ax.set_ylim(-radius*1.3, radius*1.3)
    ax.set_zlim(-radius*1.3, radius*1.3)
    
    filename = generate_filename()
    return save_figure(fig, filename)

# ==================== PARALLEL LINES ====================

def generate_parallel_lines(params):
    """Generate parallel lines with a transversal and angle markers"""
    spacing = params.get('spacing', 3)
    transversal_angle = params.get('transversalAngle', 60)  # degrees
    show_angles = params.get('showAngles', True)
    show_labels = params.get('showLabels', True)
    line_color = params.get('lineColor', 'blue')
    transversal_color = params.get('transversalColor', 'red')
    
    fig, ax = setup_figure()
    
    # Draw two parallel horizontal lines
    line_length = 8
    y1, y2 = 0, spacing
    
    ax.plot([-line_length/2, line_length/2], [y1, y1], color=line_color, linewidth=2, label='Line 1')
    ax.plot([-line_length/2, line_length/2], [y2, y2], color=line_color, linewidth=2, label='Line 2')
    
    # Draw transversal
    angle_rad = np.radians(transversal_angle)
    t_length = (spacing + 4) / np.sin(angle_rad) if np.sin(angle_rad) != 0 else 10
    
    x_offset = t_length * np.cos(angle_rad) / 2
    y_offset = t_length * np.sin(angle_rad) / 2
    
    ax.plot([-x_offset, x_offset], [spacing/2 - y_offset, spacing/2 + y_offset], 
            color=transversal_color, linewidth=2, label='Transversal')
    
    # Calculate intersection points
    # For y = y1, find x: x = (y1 - spacing/2 + y_offset) / tan(angle_rad)
    if angle_rad != 0 and angle_rad != np.pi:
        x1_int = (y1 - spacing/2) / np.tan(angle_rad)
        x2_int = (y2 - spacing/2) / np.tan(angle_rad)
        
        if show_angles:
            # Draw angle arcs at intersection points
            arc_radius = 0.5
            
            # Angles at lower line
            arc1 = Arc((x1_int, y1), arc_radius*2, arc_radius*2, angle=0, 
                       theta1=0, theta2=transversal_angle, color='green', linewidth=2)
            ax.add_patch(arc1)
            
            arc2 = Arc((x1_int, y1), arc_radius*2, arc_radius*2, angle=0,
                       theta1=transversal_angle, theta2=180, color='purple', linewidth=2)
            ax.add_patch(arc2)
            
            # Angles at upper line
            arc3 = Arc((x2_int, y2), arc_radius*2, arc_radius*2, angle=0,
                       theta1=0, theta2=transversal_angle, color='green', linewidth=2)
            ax.add_patch(arc3)
            
            arc4 = Arc((x2_int, y2), arc_radius*2, arc_radius*2, angle=0,
                       theta1=transversal_angle, theta2=180, color='purple', linewidth=2)
            ax.add_patch(arc4)
            
            # Label corresponding angles
            ax.annotate(f'{transversal_angle}°', (x1_int + 0.8, y1 + 0.3), fontsize=9, color='green')
            ax.annotate(f'{transversal_angle}°', (x2_int + 0.8, y2 + 0.3), fontsize=9, color='green')
    
    if show_labels:
        ax.annotate('L₁', (-line_length/2 - 0.5, y1), fontsize=12, va='center')
        ax.annotate('L₂', (-line_length/2 - 0.5, y2), fontsize=12, va='center')
        ax.annotate('t', (x_offset + 0.3, spacing/2 + y_offset - 0.3), fontsize=12, color=transversal_color)
    
    # Add parallel markers (arrows)
    marker_x = -line_length/4
    ax.annotate('', xy=(marker_x + 0.3, y1), xytext=(marker_x - 0.3, y1),
                arrowprops=dict(arrowstyle='->', color=line_color, lw=1.5))
    ax.annotate('', xy=(marker_x + 0.3, y2), xytext=(marker_x - 0.3, y2),
                arrowprops=dict(arrowstyle='->', color=line_color, lw=1.5))
    
    ax.set_aspect('equal')
    ax.set_xlim(-line_length/2 - 1, line_length/2 + 1)
    ax.set_ylim(-2, spacing + 2)
    ax.grid(True, alpha=0.3)
    ax.set_title('Parallel Lines with Transversal', fontsize=12)
    
    filename = generate_filename()
    return save_figure(fig, filename)

# ==================== CYCLIC QUADRILATERAL ====================

def generate_cyclic_quadrilateral(params):
    """Generate a cyclic quadrilateral inscribed in a circle"""
    radius = params.get('radius', 4)
    angles = params.get('angles', [30, 100, 200, 280])  # angles in degrees for 4 vertices
    labels = params.get('labels', ['A', 'B', 'C', 'D'])
    show_circle = params.get('showCircle', True)
    show_angles = params.get('showAngles', True)
    show_diagonals = params.get('showDiagonals', False)
    
    fig, ax = setup_figure()
    
    # Convert angles to radians and get vertices
    vertices = []
    for angle in angles:
        rad = np.radians(angle)
        x = radius * np.cos(rad)
        y = radius * np.sin(rad)
        vertices.append((x, y))
    
    # Draw circle
    if show_circle:
        circle = plt.Circle((0, 0), radius, fill=False, color='blue', linewidth=1.5)
        ax.add_patch(circle)
        ax.plot(0, 0, 'ko', markersize=3)  # center
    
    # Draw quadrilateral
    quad = Polygon(vertices, fill=False, edgecolor='black', linewidth=2)
    ax.add_patch(quad)
    
    # Draw vertices and labels
    for i, (x, y) in enumerate(vertices):
        ax.plot(x, y, 'ko', markersize=6)
        # Position label outside the vertex
        label_x = x * 1.15
        label_y = y * 1.15
        if i < len(labels):
            ax.annotate(labels[i], (label_x, label_y), fontsize=12, ha='center', va='center', fontweight='bold')
    
    # Draw diagonals if requested
    if show_diagonals:
        ax.plot([vertices[0][0], vertices[2][0]], [vertices[0][1], vertices[2][1]], 
                'g--', linewidth=1.5, label='Diagonals')
        ax.plot([vertices[1][0], vertices[3][0]], [vertices[1][1], vertices[3][1]], 
                'g--', linewidth=1.5)
    
    # Show angle markers (opposite angles sum to 180°)
    if show_angles:
        arc_radius = 0.5
        for i, (x, y) in enumerate(vertices):
            prev_v = vertices[(i - 1) % 4]
            next_v = vertices[(i + 1) % 4]
            
            # Calculate angles of sides
            angle1 = np.degrees(np.arctan2(prev_v[1] - y, prev_v[0] - x))
            angle2 = np.degrees(np.arctan2(next_v[1] - y, next_v[0] - x))
            
            # Ensure proper arc direction
            if angle2 < angle1:
                angle2 += 360
            
            color = 'red' if i % 2 == 0 else 'green'
            arc = Arc((x, y), arc_radius * 2, arc_radius * 2, 
                      theta1=angle1, theta2=angle2, color=color, linewidth=2)
            ax.add_patch(arc)
    
    ax.set_aspect('equal')
    ax.set_xlim(-radius - 2, radius + 2)
    ax.set_ylim(-radius - 2, radius + 2)
    ax.grid(True, alpha=0.3)
    ax.set_title('Cyclic Quadrilateral\n(Opposite angles sum to 180°)', fontsize=11)
    
    filename = generate_filename()
    return save_figure(fig, filename)

# ==================== TANGENT & SECANT ====================

def generate_tangent_secant(params):
    """Generate circle with tangent and/or secant lines"""
    radius = params.get('radius', 3)
    tangent_point_angle = params.get('tangentAngle', 90)  # angle on circle where tangent touches
    show_tangent = params.get('showTangent', True)
    show_secant = params.get('showSecant', True)
    secant_angle = params.get('secantAngle', 30)  # angle of secant line
    external_point = params.get('externalPoint', [-5, 0])
    show_radius_to_tangent = params.get('showRadiusToTangent', True)
    labels = params.get('labels', True)
    
    fig, ax = setup_figure()
    
    # Draw circle
    circle = plt.Circle((0, 0), radius, fill=False, color='blue', linewidth=2)
    ax.add_patch(circle)
    ax.plot(0, 0, 'ko', markersize=4)
    if labels:
        ax.annotate('O', (0.2, 0.2), fontsize=11, fontweight='bold')
    
    # Tangent point on circle
    tangent_rad = np.radians(tangent_point_angle)
    tx = radius * np.cos(tangent_rad)
    ty = radius * np.sin(tangent_rad)
    
    if show_tangent:
        # Tangent is perpendicular to radius at touch point
        # Direction perpendicular to radius
        perp_x = -np.sin(tangent_rad)
        perp_y = np.cos(tangent_rad)
        
        tangent_length = 4
        t_start_x = tx - perp_x * tangent_length
        t_start_y = ty - perp_y * tangent_length
        t_end_x = tx + perp_x * tangent_length
        t_end_y = ty + perp_y * tangent_length
        
        ax.plot([t_start_x, t_end_x], [t_start_y, t_end_y], 'r-', linewidth=2, label='Tangent')
        ax.plot(tx, ty, 'ro', markersize=6)
        
        if labels:
            ax.annotate('T', (tx + 0.3, ty + 0.3), fontsize=11, color='red', fontweight='bold')
        
        # Right angle marker at tangent point
        if show_radius_to_tangent:
            ax.plot([0, tx], [0, ty], 'g--', linewidth=1.5, label='Radius')
            # Draw right angle symbol
            marker_size = 0.3
            rx, ry = tx - marker_size * np.cos(tangent_rad), ty - marker_size * np.sin(tangent_rad)
            ax.plot([rx, rx + marker_size * perp_x], [ry, ry + marker_size * perp_y], 'g-', linewidth=1)
            ax.plot([rx + marker_size * perp_x, tx + marker_size * perp_x - marker_size * np.cos(tangent_rad)], 
                   [ry + marker_size * perp_y, ty + marker_size * perp_y - marker_size * np.sin(tangent_rad)], 'g-', linewidth=1)
    
    if show_secant:
        ext_x, ext_y = external_point
        ax.plot(ext_x, ext_y, 'mo', markersize=6)
        if labels:
            ax.annotate('P', (ext_x - 0.5, ext_y), fontsize=11, color='purple', fontweight='bold')
        
        # Calculate secant line through external point
        secant_rad = np.radians(secant_angle)
        direction = [np.cos(secant_rad), np.sin(secant_rad)]
        
        # Find intersections with circle using line-circle intersection
        # Line: P + t * d, Circle: x² + y² = r²
        dx, dy = direction
        a = dx**2 + dy**2
        b = 2 * (ext_x * dx + ext_y * dy)
        c = ext_x**2 + ext_y**2 - radius**2
        
        discriminant = b**2 - 4 * a * c
        if discriminant >= 0:
            t1 = (-b + np.sqrt(discriminant)) / (2 * a)
            t2 = (-b - np.sqrt(discriminant)) / (2 * a)
            
            int1_x, int1_y = ext_x + t1 * dx, ext_y + t1 * dy
            int2_x, int2_y = ext_x + t2 * dx, ext_y + t2 * dy
            
            ax.plot([ext_x, int1_x], [ext_y, int1_y], 'm-', linewidth=2, label='Secant')
            ax.plot([int1_x, int2_x], [int1_y, int2_y], 'm-', linewidth=2)
            ax.plot(int1_x, int1_y, 'mo', markersize=5)
            ax.plot(int2_x, int2_y, 'mo', markersize=5)
            
            if labels:
                ax.annotate('A', (int1_x + 0.3, int1_y + 0.3), fontsize=10, color='purple')
                ax.annotate('B', (int2_x + 0.3, int2_y + 0.3), fontsize=10, color='purple')
    
    ax.set_aspect('equal')
    ax.set_xlim(-radius - 3, radius + 3)
    ax.set_ylim(-radius - 2, radius + 2)
    ax.grid(True, alpha=0.3)
    ax.legend(loc='upper right', fontsize=9)
    ax.set_title('Tangent & Secant Lines', fontsize=11)
    
    filename = generate_filename()
    return save_figure(fig, filename)

# ==================== BEARINGS & LOCI ====================

def generate_bearing(params):
    """Generate bearing diagram with compass directions"""
    bearing = params.get('bearing', 45)  # bearing in degrees from North
    distance = params.get('distance', 5)
    show_compass = params.get('showCompass', True)
    start_label = params.get('startLabel', 'A')
    end_label = params.get('endLabel', 'B')
    show_angle = params.get('showAngle', True)
    
    fig, ax = setup_figure()
    
    # Draw compass rose
    if show_compass:
        compass_radius = distance * 0.15
        # Draw cardinal directions
        ax.annotate('N', (0, compass_radius + 0.3), ha='center', va='bottom', fontsize=12, fontweight='bold')
        ax.annotate('S', (0, -compass_radius - 0.3), ha='center', va='top', fontsize=12)
        ax.annotate('E', (compass_radius + 0.3, 0), ha='left', va='center', fontsize=12)
        ax.annotate('W', (-compass_radius - 0.3, 0), ha='right', va='center', fontsize=12)
        
        # Draw compass circle
        compass = plt.Circle((0, 0), compass_radius, fill=False, color='gray', linewidth=1, linestyle='--')
        ax.add_patch(compass)
        
        # Draw cardinal direction lines
        ax.plot([0, 0], [-compass_radius, compass_radius], 'gray', linewidth=0.5, linestyle='--')
        ax.plot([-compass_radius, compass_radius], [0, 0], 'gray', linewidth=0.5, linestyle='--')
    
    # Draw North line (reference)
    ax.annotate('', xy=(0, distance * 0.6), xytext=(0, 0),
                arrowprops=dict(arrowstyle='->', color='blue', lw=1.5, linestyle='--'))
    
    # Calculate endpoint based on bearing (bearing is clockwise from North)
    # North is up (90° in standard math), bearing 0° is North
    # Convert bearing to standard angle: 90 - bearing
    angle_rad = np.radians(90 - bearing)
    end_x = distance * np.cos(angle_rad)
    end_y = distance * np.sin(angle_rad)
    
    # Draw bearing line
    ax.annotate('', xy=(end_x, end_y), xytext=(0, 0),
                arrowprops=dict(arrowstyle='->', color='red', lw=2))
    
    # Draw points
    ax.plot(0, 0, 'ko', markersize=8)
    ax.plot(end_x, end_y, 'ro', markersize=8)
    
    ax.annotate(start_label, (-0.4, -0.4), fontsize=12, fontweight='bold')
    ax.annotate(end_label, (end_x + 0.3, end_y + 0.3), fontsize=12, fontweight='bold', color='red')
    
    # Draw bearing angle arc
    if show_angle:
        arc_radius = distance * 0.25
        # Arc from North (90°) clockwise to bearing direction
        theta1 = 90 - bearing if bearing <= 90 else 90 - bearing + 360
        theta2 = 90
        if bearing > 0:
            arc = Arc((0, 0), arc_radius * 2, arc_radius * 2,
                      theta1=min(theta1, theta2), theta2=max(theta1, theta2), 
                      color='green', linewidth=2)
            ax.add_patch(arc)
        
        # Label the bearing
        label_angle = np.radians(90 - bearing / 2)
        label_x = (arc_radius + 0.5) * np.cos(label_angle)
        label_y = (arc_radius + 0.5) * np.sin(label_angle)
        ax.annotate(f'{bearing}°', (label_x, label_y), fontsize=10, color='green', fontweight='bold')
    
    ax.set_aspect('equal')
    margin = distance * 0.3
    ax.set_xlim(-distance - margin, distance + margin)
    ax.set_ylim(-distance * 0.5, distance + margin)
    ax.grid(True, alpha=0.3)
    ax.set_title(f'Bearing: {bearing:03d}°', fontsize=12)
    
    filename = generate_filename()
    return save_figure(fig, filename)

# ==================== VECTORS ====================

def generate_vector(params):
    """Generate vector diagrams with arrows"""
    vectors = params.get('vectors', [{'x': 3, 'y': 2, 'label': 'a', 'color': 'blue'}])
    origin = params.get('origin', [0, 0])
    show_components = params.get('showComponents', False)
    show_resultant = params.get('showResultant', False)
    head_to_tail = params.get('headToTail', False)
    show_grid = params.get('showGrid', True)
    
    fig, ax = setup_figure()
    
    current_x, current_y = origin
    total_x, total_y = 0, 0
    
    for v in vectors:
        vx = v.get('x', 1)
        vy = v.get('y', 1)
        label = v.get('label', '')
        color = v.get('color', 'blue')
        
        end_x = current_x + vx
        end_y = current_y + vy
        
        # Draw vector arrow
        ax.annotate('', xy=(end_x, end_y), xytext=(current_x, current_y),
                    arrowprops=dict(arrowstyle='->', color=color, lw=2))
        
        # Label the vector
        mid_x = (current_x + end_x) / 2
        mid_y = (current_y + end_y) / 2
        ax.annotate(label, (mid_x + 0.2, mid_y + 0.2), fontsize=11, color=color, fontweight='bold')
        
        # Show components
        if show_components:
            ax.plot([current_x, end_x], [current_y, current_y], '--', color=color, alpha=0.5, linewidth=1)
            ax.plot([end_x, end_x], [current_y, end_y], '--', color=color, alpha=0.5, linewidth=1)
            ax.annotate(f'{vx}', (mid_x, current_y - 0.4), fontsize=9, color=color, ha='center')
            ax.annotate(f'{vy}', (end_x + 0.4, mid_y), fontsize=9, color=color, va='center')
        
        total_x += vx
        total_y += vy
        
        if head_to_tail:
            current_x, current_y = end_x, end_y
    
    # Show resultant vector
    if show_resultant and len(vectors) > 1:
        ax.annotate('', xy=(origin[0] + total_x, origin[1] + total_y), xytext=origin,
                    arrowprops=dict(arrowstyle='->', color='red', lw=2.5))
        mid_x = origin[0] + total_x / 2
        mid_y = origin[1] + total_y / 2
        magnitude = np.sqrt(total_x**2 + total_y**2)
        ax.annotate(f'R (|R|={magnitude:.1f})', (mid_x - 0.5, mid_y + 0.5), 
                   fontsize=10, color='red', fontweight='bold')
    
    # Draw axes
    ax.axhline(y=0, color='black', linewidth=0.5)
    ax.axvline(x=0, color='black', linewidth=0.5)
    
    if show_grid:
        ax.grid(True, alpha=0.3)
    
    ax.set_aspect('equal')
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    ax.set_title('Vector Diagram', fontsize=12)
    
    # Auto-scale
    all_x = [origin[0], origin[0] + total_x] + [origin[0] + v.get('x', 0) for v in vectors]
    all_y = [origin[1], origin[1] + total_y] + [origin[1] + v.get('y', 0) for v in vectors]
    margin = 2
    ax.set_xlim(min(all_x) - margin, max(all_x) + margin)
    ax.set_ylim(min(all_y) - margin, max(all_y) + margin)
    
    filename = generate_filename()
    return save_figure(fig, filename)

# ==================== SIMILARITY & CONGRUENCE ====================

def generate_similarity_congruence(params):
    """Generate two triangles showing similarity or congruence with tick marks"""
    type_ = params.get('type', 'similar')  # 'similar' or 'congruent'
    scale = params.get('scale', 0.6 if type_ == 'similar' else 1.0)
    triangle1 = params.get('triangle1', [[0, 0], [4, 0], [2, 3]])
    offset = params.get('offset', [6, 0])
    labels1 = params.get('labels1', ['A', 'B', 'C'])
    labels2 = params.get('labels2', ['P', 'Q', 'R'])
    show_ticks = params.get('showTicks', True)
    show_angles = params.get('showAngles', True)
    
    fig, ax = setup_figure(figsize=(10, 6))
    
    # Draw first triangle
    t1 = np.array(triangle1 + [triangle1[0]])  # close the triangle
    ax.plot(t1[:, 0], t1[:, 1], 'b-', linewidth=2)
    
    # Draw second triangle (scaled and offset)
    t2_base = np.array(triangle1) * scale
    t2 = t2_base + np.array(offset)
    t2_closed = np.vstack([t2, t2[0]])
    ax.plot(t2_closed[:, 0], t2_closed[:, 1], 'r-', linewidth=2)
    
    # Draw vertices and labels
    for i, (x, y) in enumerate(triangle1):
        ax.plot(x, y, 'bo', markersize=6)
        ax.annotate(labels1[i], (x - 0.3, y + 0.3), fontsize=11, color='blue', fontweight='bold')
    
    for i, (x, y) in enumerate(t2):
        ax.plot(x, y, 'ro', markersize=6)
        ax.annotate(labels2[i], (x + 0.2, y + 0.3), fontsize=11, color='red', fontweight='bold')
    
    # Add tick marks for corresponding sides
    if show_ticks:
        tick_symbols = ['|', '||', '|||']
        for i in range(3):
            j = (i + 1) % 3
            # Midpoint of side in triangle 1
            mid1 = ((triangle1[i][0] + triangle1[j][0]) / 2, 
                   (triangle1[i][1] + triangle1[j][1]) / 2)
            # Midpoint of side in triangle 2
            mid2 = ((t2[i][0] + t2[j][0]) / 2, 
                   (t2[i][1] + t2[j][1]) / 2)
            
            ax.annotate(tick_symbols[i], mid1, fontsize=10, ha='center', va='center', color='blue')
            ax.annotate(tick_symbols[i], mid2, fontsize=10, ha='center', va='center', color='red')
    
    # Add angle arcs
    if show_angles:
        arc_colors = ['green', 'purple', 'orange']
        for i in range(3):
            prev_i = (i - 1) % 3
            next_i = (i + 1) % 3
            
            # Triangle 1
            v = triangle1[i]
            angle1 = np.degrees(np.arctan2(triangle1[prev_i][1] - v[1], triangle1[prev_i][0] - v[0]))
            angle2 = np.degrees(np.arctan2(triangle1[next_i][1] - v[1], triangle1[next_i][0] - v[0]))
            if angle2 < angle1:
                angle2 += 360
            arc = Arc(v, 0.6, 0.6, theta1=angle1, theta2=angle2, color=arc_colors[i], linewidth=2)
            ax.add_patch(arc)
            
            # Triangle 2
            v2 = t2[i]
            angle1 = np.degrees(np.arctan2(t2[prev_i][1] - v2[1], t2[prev_i][0] - v2[0]))
            angle2 = np.degrees(np.arctan2(t2[next_i][1] - v2[1], t2[next_i][0] - v2[0]))
            if angle2 < angle1:
                angle2 += 360
            arc = Arc(v2, 0.6 * scale, 0.6 * scale, theta1=angle1, theta2=angle2, color=arc_colors[i], linewidth=2)
            ax.add_patch(arc)
    
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.3)
    
    title = 'Similar Triangles' if type_ == 'similar' else 'Congruent Triangles'
    if type_ == 'similar':
        title += f' (Scale factor: {scale})'
    ax.set_title(title, fontsize=12)
    
    filename = generate_filename()
    return save_figure(fig, filename)

# ==================== CIRCLE THEOREMS ====================

def generate_circle_theorem(params):
    """Generate diagrams illustrating various circle theorems"""
    theorem = params.get('theorem', 'inscribed_angle')
    radius = params.get('radius', 4)
    show_labels = params.get('showLabels', True)
    show_angle_values = params.get('showAngleValues', True)
    
    fig, ax = setup_figure()
    
    # Draw circle
    circle = plt.Circle((0, 0), radius, fill=False, color='blue', linewidth=2)
    ax.add_patch(circle)
    ax.plot(0, 0, 'ko', markersize=4)
    if show_labels:
        ax.annotate('O', (0.25, 0.25), fontsize=10, fontweight='bold')
    
    if theorem == 'inscribed_angle' or theorem == 'central_inscribed':
        # Central angle is twice the inscribed angle
        arc_start = 30  # degrees
        arc_end = 150
        inscribed_point_angle = 270  # point on circle where inscribed angle is formed
        
        # Points on arc
        a_rad = np.radians(arc_start)
        b_rad = np.radians(arc_end)
        c_rad = np.radians(inscribed_point_angle)
        
        ax_pt = radius * np.cos(a_rad)
        ay_pt = radius * np.sin(a_rad)
        bx_pt = radius * np.cos(b_rad)
        by_pt = radius * np.sin(b_rad)
        cx_pt = radius * np.cos(c_rad)
        cy_pt = radius * np.sin(c_rad)
        
        # Draw central angle
        ax.plot([0, ax_pt], [0, ay_pt], 'r-', linewidth=2)
        ax.plot([0, bx_pt], [0, by_pt], 'r-', linewidth=2)
        
        # Draw inscribed angle
        ax.plot([cx_pt, ax_pt], [cy_pt, ay_pt], 'g-', linewidth=2)
        ax.plot([cx_pt, bx_pt], [cy_pt, by_pt], 'g-', linewidth=2)
        
        # Points
        ax.plot(ax_pt, ay_pt, 'ko', markersize=6)
        ax.plot(bx_pt, by_pt, 'ko', markersize=6)
        ax.plot(cx_pt, cy_pt, 'go', markersize=6)
        
        if show_labels:
            ax.annotate('A', (ax_pt * 1.1, ay_pt * 1.1), fontsize=11, fontweight='bold')
            ax.annotate('B', (bx_pt * 1.1, by_pt * 1.1), fontsize=11, fontweight='bold')
            ax.annotate('C', (cx_pt * 1.1, cy_pt * 1.1), fontsize=11, color='green', fontweight='bold')
        
        # Angle arcs
        central_angle = arc_end - arc_start
        inscribed_angle = central_angle / 2
        
        # Central angle arc
        arc1 = Arc((0, 0), 1.2, 1.2, theta1=arc_start, theta2=arc_end, color='red', linewidth=2)
        ax.add_patch(arc1)
        
        if show_angle_values:
            ax.annotate(f'{central_angle}°', (0.8, 0.5), fontsize=9, color='red')
            ax.annotate(f'{inscribed_angle}°', (cx_pt + 0.8, cy_pt + 0.5), fontsize=9, color='green')
        
        ax.set_title('Central Angle = 2 × Inscribed Angle', fontsize=11)
    
    elif theorem == 'semicircle':
        # Angle in semicircle is 90°
        # Diameter endpoints
        ax.plot([-radius, radius], [0, 0], 'r-', linewidth=2, label='Diameter')
        ax.plot(-radius, 0, 'ko', markersize=6)
        ax.plot(radius, 0, 'ko', markersize=6)
        
        # Point on semicircle
        angle = 60  # degrees
        px = radius * np.cos(np.radians(angle))
        py = radius * np.sin(np.radians(angle))
        
        ax.plot([px, -radius], [py, 0], 'g-', linewidth=2)
        ax.plot([px, radius], [py, 0], 'g-', linewidth=2)
        ax.plot(px, py, 'go', markersize=6)
        
        if show_labels:
            ax.annotate('A', (-radius - 0.4, -0.2), fontsize=11, fontweight='bold')
            ax.annotate('B', (radius + 0.2, -0.2), fontsize=11, fontweight='bold')
            ax.annotate('P', (px + 0.2, py + 0.3), fontsize=11, color='green', fontweight='bold')
        
        # Right angle marker at P
        marker_size = 0.4
        ax.plot([px - marker_size, px - marker_size, px], 
               [py, py - marker_size, py - marker_size], 'g-', linewidth=1.5)
        
        if show_angle_values:
            ax.annotate('90°', (px - 0.8, py - 0.6), fontsize=10, color='green', fontweight='bold')
        
        ax.set_title('Angle in Semicircle = 90°', fontsize=11)
    
    elif theorem == 'tangent_chord':
        # Angle between tangent and chord equals inscribed angle
        touch_angle = 0  # tangent touches at this angle
        chord_end_angle = 120
        inscribed_angle_pos = 240
        
        tx = radius * np.cos(np.radians(touch_angle))
        ty = radius * np.sin(np.radians(touch_angle))
        cx = radius * np.cos(np.radians(chord_end_angle))
        cy = radius * np.sin(np.radians(chord_end_angle))
        px = radius * np.cos(np.radians(inscribed_angle_pos))
        py = radius * np.sin(np.radians(inscribed_angle_pos))
        
        # Tangent line
        ax.plot([tx - 0.5, tx + 4], [ty - 2, ty + 2], 'r-', linewidth=2, label='Tangent')
        
        # Chord
        ax.plot([tx, cx], [ty, cy], 'b-', linewidth=2, label='Chord')
        
        # Inscribed angle
        ax.plot([px, tx], [py, ty], 'g--', linewidth=1.5)
        ax.plot([px, cx], [py, cy], 'g--', linewidth=1.5)
        
        ax.plot(tx, ty, 'ko', markersize=6)
        ax.plot(cx, cy, 'ko', markersize=6)
        ax.plot(px, py, 'go', markersize=6)
        
        if show_labels:
            ax.annotate('T', (tx + 0.3, ty - 0.4), fontsize=11, fontweight='bold')
            ax.annotate('C', (cx - 0.5, cy + 0.2), fontsize=11, fontweight='bold')
            ax.annotate('P', (px - 0.5, py - 0.3), fontsize=11, color='green', fontweight='bold')
        
        ax.set_title('Tangent-Chord Angle = Inscribed Angle', fontsize=11)
    
    elif theorem == 'equal_chords':
        # Equal chords are equidistant from center
        angle1, angle2 = 40, 140
        angle3, angle4 = 220, 320
        
        for a1, a2, color in [(angle1, angle2, 'blue'), (angle3, angle4, 'red')]:
            x1 = radius * np.cos(np.radians(a1))
            y1 = radius * np.sin(np.radians(a1))
            x2 = radius * np.cos(np.radians(a2))
            y2 = radius * np.sin(np.radians(a2))
            
            ax.plot([x1, x2], [y1, y2], color=color, linewidth=2)
            ax.plot(x1, y1, 'ko', markersize=5)
            ax.plot(x2, y2, 'ko', markersize=5)
            
            # Perpendicular from center
            mid_x, mid_y = (x1 + x2) / 2, (y1 + y2) / 2
            ax.plot([0, mid_x], [0, mid_y], '--', color=color, alpha=0.5, linewidth=1.5)
            ax.plot(mid_x, mid_y, 'o', color=color, markersize=4)
        
        ax.set_title('Equal Chords are Equidistant from Center', fontsize=11)
    
    ax.set_aspect('equal')
    ax.set_xlim(-radius - 2, radius + 2)
    ax.set_ylim(-radius - 2, radius + 2)
    ax.grid(True, alpha=0.3)
    
    filename = generate_filename()
    return save_figure(fig, filename)

# ==================== PROOF DIAGRAM ====================

def generate_proof_diagram(params):
    """Generate diagrams commonly used in geometry proofs"""
    proof_type = params.get('proofType', 'triangle_midpoints')
    show_labels = params.get('showLabels', True)
    show_markings = params.get('showMarkings', True)
    
    fig, ax = setup_figure()
    
    if proof_type == 'triangle_midpoints':
        # Triangle with midpoints and midsegments
        triangle = [[0, 0], [6, 0], [3, 5]]
        
        # Draw triangle
        t = np.array(triangle + [triangle[0]])
        ax.plot(t[:, 0], t[:, 1], 'b-', linewidth=2)
        
        # Calculate and draw midpoints
        midpoints = []
        for i in range(3):
            j = (i + 1) % 3
            mid = [(triangle[i][0] + triangle[j][0]) / 2, 
                   (triangle[i][1] + triangle[j][1]) / 2]
            midpoints.append(mid)
            ax.plot(mid[0], mid[1], 'ro', markersize=6)
        
        # Draw midsegments
        for i in range(3):
            j = (i + 1) % 3
            ax.plot([midpoints[i][0], midpoints[j][0]], 
                   [midpoints[i][1], midpoints[j][1]], 'r--', linewidth=1.5)
        
        # Labels
        if show_labels:
            labels = ['A', 'B', 'C']
            mid_labels = ['M', 'N', 'P']
            for i, (x, y) in enumerate(triangle):
                offset = [-0.4, -0.4] if i == 0 else [0.3, -0.4] if i == 1 else [0, 0.3]
                ax.annotate(labels[i], (x + offset[0], y + offset[1]), 
                           fontsize=11, fontweight='bold')
            for i, (x, y) in enumerate(midpoints):
                ax.annotate(mid_labels[i], (x + 0.2, y + 0.2), 
                           fontsize=10, color='red', fontweight='bold')
        
        ax.set_title('Triangle Midpoint Theorem\nMidsegment ∥ Base, Length = ½ Base', fontsize=11)
    
    elif proof_type == 'isosceles':
        # Isosceles triangle with equal sides marked
        triangle = [[0, 0], [4, 0], [2, 4]]
        
        t = np.array(triangle + [triangle[0]])
        ax.plot(t[:, 0], t[:, 1], 'b-', linewidth=2)
        
        # Equal side markings
        if show_markings:
            # Mark equal sides with tick marks
            for side_pair in [([0, 2], [2, 2])]:  # sides AC and BC
                for (i, j) in [(0, 2), (1, 2)]:
                    mid_x = (triangle[i][0] + triangle[j][0]) / 2
                    mid_y = (triangle[i][1] + triangle[j][1]) / 2
                    ax.plot(mid_x, mid_y, 'r|', markersize=15, mew=2)
        
        # Draw altitude/angle bisector from apex
        ax.plot([2, 2], [4, 0], 'g--', linewidth=1.5)
        
        # Base angles marked equal
        arc_radius = 0.6
        arc1 = Arc((0, 0), arc_radius * 2, arc_radius * 2, theta1=0, theta2=63, color='purple', linewidth=2)
        arc2 = Arc((4, 0), arc_radius * 2, arc_radius * 2, theta1=117, theta2=180, color='purple', linewidth=2)
        ax.add_patch(arc1)
        ax.add_patch(arc2)
        
        if show_labels:
            ax.annotate('A', (-0.3, -0.4), fontsize=11, fontweight='bold')
            ax.annotate('B', (4.2, -0.4), fontsize=11, fontweight='bold')
            ax.annotate('C', (2, 4.3), fontsize=11, fontweight='bold')
        
        ax.set_title('Isosceles Triangle\nEqual sides → Equal base angles', fontsize=11)
    
    elif proof_type == 'exterior_angle':
        # Exterior angle of triangle
        triangle = [[0, 0], [5, 0], [3, 3]]
        
        t = np.array(triangle + [triangle[0]])
        ax.plot(t[:, 0], t[:, 1], 'b-', linewidth=2)
        
        # Extend side to show exterior angle
        ax.plot([5, 7], [0, 0], 'b-', linewidth=2)
        
        # Interior angles
        arc1 = Arc((0, 0), 0.8, 0.8, theta1=0, theta2=45, color='green', linewidth=2)
        arc2 = Arc((3, 3), 0.8, 0.8, theta1=-45, theta2=-135, color='red', linewidth=2)
        ax.add_patch(arc1)
        ax.add_patch(arc2)
        
        # Exterior angle
        arc3 = Arc((5, 0), 0.8, 0.8, theta1=0, theta2=149, color='purple', linewidth=2)
        ax.add_patch(arc3)
        
        if show_labels:
            ax.annotate('A', (-0.4, -0.3), fontsize=11, fontweight='bold')
            ax.annotate('B', (5.1, -0.5), fontsize=11, fontweight='bold')
            ax.annotate('C', (3, 3.3), fontsize=11, fontweight='bold')
            ax.annotate('α', (0.9, 0.3), fontsize=10, color='green')
            ax.annotate('β', (2.3, 2.5), fontsize=10, color='red')
            ax.annotate('α+β', (5.8, 0.5), fontsize=10, color='purple')
        
        ax.set_title('Exterior Angle Theorem\nExterior angle = Sum of remote interior angles', fontsize=11)
    
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.3)
    
    filename = generate_filename()
    return save_figure(fig, filename)

# ==================== MAIN HANDLER ====================

GENERATORS = {
    # Graphs
    'linear': generate_linear_graph,
    'quadratic': generate_quadratic_graph,
    'polynomial': generate_polynomial_graph,
    'trig': generate_trig_graph,
    'exponential': generate_exponential_graph,
    'logarithm': generate_logarithm_graph,
    'hyperbola': generate_hyperbola_graph,
    
    # 2D Geometry
    'triangle': generate_triangle,
    'circle': generate_circle,
    'rectangle': generate_rectangle,
    'polygon': generate_polygon,
    'angle': generate_angle,
    'parallelLines': generate_parallel_lines,
    
    # 3D Shapes
    'cylinder': generate_cylinder,
    'cube': generate_cube,
    'prism': generate_cube,  # alias for cube with different dimensions
    'cone': generate_cone,
    'pyramid': generate_pyramid,
    'sphere': generate_sphere,
    
    # Number & Coordinate
    'numberLine': generate_number_line,
    'coordinatePlane': generate_coordinate_plane,
    
    # Special
    'pie': generate_pie_chart,
    'bar': generate_bar_chart,
    'venn': generate_venn_diagram,
    'fraction': generate_fraction_visual,
    'transformation': generate_transformation,
    
    # Advanced Geometry (Grade 10-12)
    'cyclicQuadrilateral': generate_cyclic_quadrilateral,
    'tangentSecant': generate_tangent_secant,
    'bearing': generate_bearing,
    'vector': generate_vector,
    'similarityCongruence': generate_similarity_congruence,
    'circleTheorem': generate_circle_theorem,
    'proofDiagram': generate_proof_diagram,
}

def main():
    ensure_output_dir()
    
    try:
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON input: {str(e)}'}))
        sys.exit(1)
    
    image_type = input_data.get('type', '')
    params = input_data.get('params', {})
    
    if image_type not in GENERATORS:
        available = ', '.join(GENERATORS.keys())
        print(json.dumps({'error': f'Unknown image type: {image_type}. Available types: {available}'}))
        sys.exit(1)
    
    try:
        filepath = GENERATORS[image_type](params)
        print(json.dumps({
            'success': True,
            'imageUrl': '/' + filepath,
            'type': image_type
        }))
    except Exception as e:
        print(json.dumps({'error': f'Generation failed: {str(e)}'}))
        sys.exit(1)

if __name__ == '__main__':
    main()
