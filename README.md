# d3 process map

This is a PHP web application that displays a directed acyclic graph in a
modern web browser using [d3.js](http://d3js.org/).  It is designed for
illustrating the relationships between objects in a process.

### Examples

#### Data manipulation and reporting process:


[![Default dataset](https://nylen.io/d3-process-map/img/thumb-default.png)](https://nylen.io/d3-process-map/)
<br>https://nylen.io/d3-process-map/

#### Co-occurrences of Les Miserables characters:

[![Les Mis dataset](https://nylen.io/d3-process-map/img/thumb-les-mis.png)](https://nylen.io/d3-process-map/?dataset=les-mis)
<br>https://nylen.io/d3-process-map/?dataset=les-mis

### Features

* Hover over a node to see that object's relationships.  (Unrelated objects and
  links will be made partially transparent.)
* Click on a node to show the documentation for that object.
* Click the "View list" button to view the documentation for all objects (good
  for printing).

### Data format

The application can display one or more datasets located in the `data/` folder.
Each dataset gets its own folder.  There are two datasets bundled with the
application (one for each of the examples above).  Switch between datasets by
appending `?dataset=folder-name` to the URL.  If no dataset name is given, the
dataset in the `default` folder will be displayed.

Each dataset should contain the following files:

* `objects.json`
* `config.json`
* `*.mkdn` (one per object)

#### `objects.json`

An array of data objects to be displayed as graph nodes, each with the
following properties:

* `name`: The name of this object
* `type`: The type of this object (e.g. `view`, `table`, etc.)
* `depends`: An array of object names that this object depends on.
* `group` (optional): This could be thought of as a "subtype".

#### `config.json`

A JSON object which contains the following fields:

* `title`: The page title.
* `graph`: The parameters for the graph and the d3.js force layout.
  * `linkDistance`: The
    [link distance](https://github.com/mbostock/d3/wiki/Force-Layout#wiki-linkDistance)
    for the d3.js force layout.
  * `charge`: The
    [charge](https://github.com/mbostock/d3/wiki/Force-Layout#wiki-charge)
    for the d3.js force layout.
  * `height`: The height of the graph, in pixels.  (The width of the graph is
    determined by the width of the browser window when the page is loaded.)
  * `numColors`: The number of colors to display (between **3** and **12**).
  * `labelPadding`: The padding inside the node rectangles, in pixels.
  * `labelMargin`: The margin outside the node rectangles, in pixels.
* `types`: Descriptions of the object types displayed in this graph, each with
  a `long` and a `short` field that describe the object type for documentation
  and for the graph legend, respectively.
* `constraints`: An array of objects that describe how to position the nodes.
  Each constraint should have a `type` field whose value should be either
  `'position'` or `'linkStrength'`, and a `has` field that specifies the
  conditions an object must meet for the constraints to be applied.
  * **Position constraints**:  These constraints should have the properties
    `weight`, `x` (optional) and `y` (optional).  On each iteration of the
    force layout, node positions will be "nudged" towards the `x` and/or `y`
    values given, with a force proportional to the `weight` given.
  * **Link strength constraints**:  These constraints should have the property
    `strength`, which is a multiplier on the link strength of the links to and
    from the objects that the constraint applies to.  This can be used to relax
    the position of certain nodes.

#### `*.mkdn`

Each object can have a Markdown file associated with it for additional
documentation.  The syntax is
[standard Markdown](https://daringfireball.net/projects/markdown/syntax) with
one addition:  object names can be enclosed in `{{brackets}}` to insert a link
to that object.

If an object's name contains a slash (`/`), replace it with an underscore (`_`)
in the documentation filename.

### Other details

The code uses a
[d3.js force layout](https://github.com/mbostock/d3/wiki/Force-Layout) to
compute object positions, with
[collision detection](http://bl.ocks.org/mbostock/3231298) to prevent nodes
from overlapping each other.

Nodes are colored by the
[ColorBrewer Set3 scheme](http://colorbrewer2.org/?type=qualitative&scheme=Set3&n=12),
with colors assigned by the combination of the object's `type` and `group`.

To ensure that the arrows on the ends of the links remain visible, the links
only extend to the outer edge of the target object's node.

### Browser support

Works in recent versions of Chrome and Firefox.  Other browsers have not been
tested, but Internet Explorer doesn't stand a chance until at least version 9.
