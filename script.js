var graph       = {},
    selected    = {},
    highlighted = null,
    isIE        = false;

$(function() {
    resize();

    isIE = $.browser.msie;

    if ($.browser.mozilla) {
        $('body').addClass('firefox');
    }

    d3.json(config.jsonUrl, function(data) {
        if (data.errors.length) {
            alert('Data error(s):\n\n' + data.errors.join('\n'));
            return;
        }

        graph.data = data.data;
        drawGraph();
    });

    $('#docs-close').on('click', function() {
        deselectObject();
        return false;
    });

    $(document).on('click', '.select-object', function() {
        var obj = graph.data[$(this).data('name')];
        if (obj) {
            selectObject(obj);
        }
        return false;
    });

    $(window).on('resize', resize);
});

function drawGraph() {
    $('#graph').empty();

    graph.margin = {
        top    : 20,
        right  : 20,
        bottom : 20,
        left   : 20
    };

    var display = $('#graph').css('display');
    $('#graph')
        .css('display', 'block')
        .css('height', config.graph.height + 'px');
    graph.width  = $('#graph').width()  - graph.margin.left - graph.margin.right;
    graph.height = $('#graph').height() - graph.margin.top  - graph.margin.bottom;
    $('#graph').css('display', display);

    for (var name in graph.data) {
        var obj = graph.data[name];
        obj.positionConstraints = [];
        obj.linkStrength        = 1;

        config.constraints.forEach(function(c) {
            for (var k in c.has) {
                if (c.has[k] !== obj[k]) {
                    return true;
                }
            }

            switch (c.type) {
                case 'position':
                    obj.positionConstraints.push({
                        weight : c.weight,
                        x      : c.x * graph.width,
                        y      : c.y * graph.height
                    });
                    break;

                case 'linkStrength':
                    obj.linkStrength *= c.strength;
                    break;
            }
        });
    }

    graph.links = [];
    for (var name in graph.data) {
        var obj = graph.data[name];
        for (var depIndex in obj.depends) {
            var link = {
                source : graph.data[obj.depends[depIndex]],
                target : obj
            };
            link.strength = (link.source.linkStrength || 1)
                          * (link.target.linkStrength || 1);
            graph.links.push(link);
        }
    }

    graph.categories = {};
    for (var name in graph.data) {
        var obj = graph.data[name],
            key = obj.type + ':' + (obj.group || ''),
            cat = graph.categories[key];

        obj.categoryKey = key;
        if (!cat) {
            cat = graph.categories[key] = {
                key      : key,
                type     : obj.type,
                typeName : (config.types[obj.type]
                            ? config.types[obj.type].short
                            : obj.type),
                group    : obj.group,
                count    : 0
            };
        }
        cat.count++;
    }
    graph.categoryKeys = d3.keys(graph.categories);

    graph.colors = colorbrewer.Set3[config.graph.numColors];

    function getColorScale(darkness) {
        return d3.scale.ordinal()
            .domain(graph.categoryKeys)
            .range(graph.colors.map(function(c) {
                return d3.hsl(c).darker(darkness).toString();
            }));
    }

    graph.strokeColor = getColorScale( 0.7);
    graph.fillColor   = getColorScale(-0.1);

    graph.nodeValues = d3.values(graph.data);

    graph.force = d3.layout.force()
        .nodes(graph.nodeValues)
        .links(graph.links)
        .linkStrength(function(d) { return d.strength; })
        .size([graph.width, graph.height])
        .linkDistance(config.graph.linkDistance)
        .charge(config.graph.charge)
        .on('tick', tick);

    graph.svg = d3.select('#graph').append('svg')
        .attr('width' , graph.width  + graph.margin.left + graph.margin.right)
        .attr('height', graph.height + graph.margin.top  + graph.margin.bottom)
      .append('g')
        .attr('transform', 'translate(' + graph.margin.left + ',' + graph.margin.top + ')');

    graph.svg.append('defs').selectAll('marker')
        .data(['end'])
      .enter().append('marker')
        .attr('id'          , String)
        .attr('viewBox'     , '0 -5 10 10')
        .attr('refX'        , 10)
        .attr('refY'        , 0)
        .attr('markerWidth' , 6)
        .attr('markerHeight', 6)
        .attr('orient'      , 'auto')
      .append('path')
        .attr('d', 'M0,-5L10,0L0,5');

    // adapted from http://stackoverflow.com/questions/9630008
    // and http://stackoverflow.com/questions/17883655

    var glow = graph.svg.append('filter')
        .attr('x'     , '-50%')
        .attr('y'     , '-50%')
        .attr('width' , '200%')
        .attr('height', '200%')
        .attr('id'    , 'blue-glow');

    glow.append('feColorMatrix')
        .attr('type'  , 'matrix')
        .attr('values', '0 0 0 0  0 '
                      + '0 0 0 0  0 '
                      + '0 0 0 0  .7 '
                      + '0 0 0 1  0 ');

    glow.append('feGaussianBlur')
        .attr('stdDeviation', 3)
        .attr('result'      , 'coloredBlur');

    glow.append('feMerge').selectAll('feMergeNode')
        .data(['coloredBlur', 'SourceGraphic'])
      .enter().append('feMergeNode')
        .attr('in', String);

    graph.legend = graph.svg.append('g')
        .attr('class', 'legend')
        .attr('x', 0)
        .attr('y', 0)
      .selectAll('.category')
        .data(d3.values(graph.categories))
      .enter().append('g')
        .attr('class', 'category');

    graph.legendConfig = {
        rectWidth   : 12,
        rectHeight  : 12,
        xOffset     : -10,
        yOffset     : 30,
        xOffsetText : 20,
        yOffsetText : 10,
        lineHeight  : 15
    };
    graph.legendConfig.xOffsetText += graph.legendConfig.xOffset;
    graph.legendConfig.yOffsetText += graph.legendConfig.yOffset;

    graph.legend.append('rect')
        .attr('x', graph.legendConfig.xOffset)
        .attr('y', function(d, i) {
            return graph.legendConfig.yOffset + i * graph.legendConfig.lineHeight;
        })
        .attr('height', graph.legendConfig.rectHeight)
        .attr('width' , graph.legendConfig.rectWidth)
        .attr('fill'  , function(d) {
            return graph.fillColor(d.key);
        })
        .attr('stroke', function(d) {
            return graph.strokeColor(d.key);
        });

    graph.legend.append('text')
        .attr('x', graph.legendConfig.xOffsetText)
        .attr('y', function(d, i) {
            return graph.legendConfig.yOffsetText + i * graph.legendConfig.lineHeight;
        })
        .text(function(d) {
            return d.typeName + (d.group ? ': ' + d.group : '');
        });

    $('#graph-container').on('scroll', function() {
        graph.legend.attr('transform', 'translate(0,' + $(this).scrollTop() + ')');
    });

    graph.line = graph.svg.append('g').selectAll('.link')
        .data(graph.force.links())
      .enter().append('line')
        .attr('class', 'link');

    graph.draggedThreshold = d3.scale.linear()
        .domain([0, 0.1])
        .range([5, 20])
        .clamp(true);

    function dragged(d) {
        var threshold = graph.draggedThreshold(graph.force.alpha()),
            dx        = d.oldX - d.px,
            dy        = d.oldY - d.py;
        if (Math.abs(dx) >= threshold || Math.abs(dy) >= threshold) {
            d.dragged = true;
        }
        return d.dragged;
    }

    graph.drag = d3.behavior.drag()
        .origin(function(d) { return d; })
        .on('dragstart', function(d) {
            d.oldX    = d.x;
            d.oldY    = d.y;
            d.dragged = false;
            d.fixed |= 2;
        })
        .on('drag', function(d) {
            d.px = d3.event.x;
            d.py = d3.event.y;
            if (dragged(d)) {
                if (!graph.force.alpha()) {
                    graph.force.alpha(.025);
                }
            }
        })
        .on('dragend', function(d) {
            if (!dragged(d)) {
                selectObject(d, this);
            }
            d.fixed &= ~6;
        });

    $('#graph-container').on('click', function(e) {
        if (!$(e.target).closest('.node').length) {
            deselectObject();
        }
    });

    graph.node = graph.svg.selectAll('.node')
        .data(graph.force.nodes())
      .enter().append('g')
        .attr('class', 'node')
        .call(graph.drag)
        .on('mouseover', function(d) {
            if (!selected.obj) {
                if (graph.mouseoutTimeout) {
                    clearTimeout(graph.mouseoutTimeout);
                    graph.mouseoutTimeout = null;
                }
                highlightObject(d);
            }
        })
        .on('mouseout', function() {
            if (!selected.obj) {
                if (graph.mouseoutTimeout) {
                    clearTimeout(graph.mouseoutTimeout);
                    graph.mouseoutTimeout = null;
                }
                graph.mouseoutTimeout = setTimeout(function() {
                    highlightObject(null);
                }, 300);
            }
        });

    graph.nodeRect = graph.node.append('rect')
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('stroke', function(d) {
            return graph.strokeColor(d.categoryKey);
        })
        .attr('fill', function(d) {
            return graph.fillColor(d.categoryKey);
        })
        .attr('width' , 120)
        .attr('height', 30);

    graph.node.each(function(d) {
        var node  = d3.select(this),
            rect  = node.select('rect'),
            lines = wrap(d.name),
            ddy   = 1.1,
            dy    = -ddy * lines.length / 2 + .5;

        lines.forEach(function(line) {
            var text = node.append('text')
                .text(line)
                .attr('dy', dy + 'em');
            dy += ddy;
        });
    });

    setTimeout(function() {
        graph.node.each(function(d) {
            var node   = d3.select(this),
                text   = node.selectAll('text'),
                bounds = {},
                first  = true;

            text.each(function() {
                var box = this.getBBox();
                if (first || box.x < bounds.x1) {
                    bounds.x1 = box.x;
                }
                if (first || box.y < bounds.y1) {
                    bounds.y1 = box.y;
                }
                if (first || box.x + box.width > bounds.x2) {
                    bounds.x2 = box.x + box.width;
                }
                if (first || box.y + box.height > bounds.y2) {
                    bounds.y2 = box.y + box.height;
                }
                first = false;
            }).attr('text-anchor', 'middle');

            var padding  = config.graph.labelPadding,
                margin   = config.graph.labelMargin,
                oldWidth = bounds.x2 - bounds.x1;

            bounds.x1 -= oldWidth / 2;
            bounds.x2 -= oldWidth / 2;

            bounds.x1 -= padding.left;
            bounds.y1 -= padding.top;
            bounds.x2 += padding.left + padding.right;
            bounds.y2 += padding.top  + padding.bottom;

            node.select('rect')
                .attr('x', bounds.x1)
                .attr('y', bounds.y1)
                .attr('width' , bounds.x2 - bounds.x1)
                .attr('height', bounds.y2 - bounds.y1);

            d.extent = {
                left   : bounds.x1 - margin.left,
                right  : bounds.x2 + margin.left + margin.right,
                top    : bounds.y1 - margin.top,
                bottom : bounds.y2 + margin.top  + margin.bottom
            };

            d.edge = {
                left   : new geo.LineSegment(bounds.x1, bounds.y1, bounds.x1, bounds.y2),
                right  : new geo.LineSegment(bounds.x2, bounds.y1, bounds.x2, bounds.y2),
                top    : new geo.LineSegment(bounds.x1, bounds.y1, bounds.x2, bounds.y1),
                bottom : new geo.LineSegment(bounds.x1, bounds.y2, bounds.x2, bounds.y2)
            };
        });

        graph.numTicks = 0;
        graph.preventCollisions = false;
        graph.force.start();
        for (var i = 0; i < config.graph.ticksWithoutCollisions; i++) {
            graph.force.tick();
        }
        graph.preventCollisions = true;
        $('#graph-container').css('visibility', 'visible');
    });
}

var maxLineChars = 26,
    wrapChars    = ' /_-.'.split('');

function wrap(text) {
    if (text.length <= maxLineChars) {
        return [text];
    } else {
        for (var k = 0; k < wrapChars.length; k++) {
            var c = wrapChars[k];
            for (var i = maxLineChars; i >= 0; i--) {
                if (text.charAt(i) === c) {
                    var line = text.substring(0, i + 1);
                    return [line].concat(wrap(text.substring(i + 1)));
                }
            }
        }
        return [text.substring(0, maxLineChars)]
            .concat(wrap(text.substring(maxLineChars)));
    }
}

function preventCollisions() {
    var quadtree = d3.geom.quadtree(graph.nodeValues);

    for (var name in graph.data) {
        var obj = graph.data[name],
            ox1 = obj.x + obj.extent.left,
            ox2 = obj.x + obj.extent.right,
            oy1 = obj.y + obj.extent.top,
            oy2 = obj.y + obj.extent.bottom;

        quadtree.visit(function(quad, x1, y1, x2, y2) {
            if (quad.point && quad.point !== obj) {
                // Check if the rectangles intersect
                var p   = quad.point,
                    px1 = p.x + p.extent.left,
                    px2 = p.x + p.extent.right,
                    py1 = p.y + p.extent.top,
                    py2 = p.y + p.extent.bottom,
                    ix  = (px1 <= ox2 && ox1 <= px2 && py1 <= oy2 && oy1 <= py2);
                if (ix) {
                    var xa1 = ox2 - px1, // shift obj left , p right
                        xa2 = px2 - ox1, // shift obj right, p left
                        ya1 = oy2 - py1, // shift obj up   , p down
                        ya2 = py2 - oy1, // shift obj down , p up
                        adj = Math.min(xa1, xa2, ya1, ya2);

                    if (adj == xa1) {
                        obj.x -= adj / 2;
                        p.x   += adj / 2;
                    } else if (adj == xa2) {
                        obj.x += adj / 2;
                        p.x   -= adj / 2;
                    } else if (adj == ya1) {
                        obj.y -= adj / 2;
                        p.y   += adj / 2;
                    } else if (adj == ya2) {
                        obj.y += adj / 2;
                        p.y   -= adj / 2;
                    }
                }
                return ix;
            }
        });
    }
}

function tick(e) {
    graph.numTicks++;

    for (var name in graph.data) {
        var obj = graph.data[name];

        obj.positionConstraints.forEach(function(c) {
            var w = c.weight * e.alpha;
            if (!isNaN(c.x)) {
                obj.x = (c.x * w + obj.x * (1 - w));
            }
            if (!isNaN(c.y)) {
                obj.y = (c.y * w + obj.y * (1 - w));
            }
        });
    }

    if (graph.preventCollisions) {
        preventCollisions();
    }

    graph.line
        .attr('x1', function(d) {
            return d.source.x;
        })
        .attr('y1', function(d) {
            return d.source.y;
        })
        .each(function(d) {
            if (isIE) {
                // Work around IE bug regarding paths with markers
                // Credit: #6 and http://stackoverflow.com/a/18475039/106302
                this.parentNode.insertBefore(this, this);
            }

            var x    = d.target.x,
                y    = d.target.y,
                line = new geo.LineSegment(d.source.x, d.source.y, x, y);

            for (var e in d.target.edge) {
                var ix = line.intersect(d.target.edge[e].offset(x, y));
                if (ix.in1 && ix.in2) {
                    x = ix.x;
                    y = ix.y;
                    break;
                }
            }

            d3.select(this)
                .attr('x2', x)
                .attr('y2', y);
        });

    graph.node
        .attr('transform', function(d) {
            return 'translate(' + d.x + ',' + d.y + ')';
        });
}

function selectObject(obj, el) {
    var node;
    if (el) {
        node = d3.select(el);
    } else {
        graph.node.each(function(d) {
            if (d === obj) {
                node = d3.select(el = this);
            }
        });
    }
    if (!node) return;

    if (node.classed('selected')) {
        deselectObject();
        return;
    }
    deselectObject(false);

    selected = {
        obj : obj,
        el  : el
    };

    highlightObject(obj);

    node.classed('selected', true);
    $('#docs').html(obj.docs);
    $('#docs-container').scrollTop(0);
    resize(true);

    var $graph   = $('#graph-container'),
        nodeRect = {
            left   : obj.x + obj.extent.left + graph.margin.left,
            top    : obj.y + obj.extent.top  + graph.margin.top,
            width  : obj.extent.right  - obj.extent.left,
            height : obj.extent.bottom - obj.extent.top
        },
        graphRect = {
            left   : $graph.scrollLeft(),
            top    : $graph.scrollTop(),
            width  : $graph.width(),
            height : $graph.height()
        };
    if (nodeRect.left < graphRect.left ||
        nodeRect.top  < graphRect.top  ||
        nodeRect.left + nodeRect.width  > graphRect.left + graphRect.width ||
        nodeRect.top  + nodeRect.height > graphRect.top  + graphRect.height) {

        $graph.animate({
            scrollLeft : nodeRect.left + nodeRect.width  / 2 - graphRect.width  / 2,
            scrollTop  : nodeRect.top  + nodeRect.height / 2 - graphRect.height / 2
        }, 500);
    }
}

function deselectObject(doResize) {
    if (doResize || typeof doResize == 'undefined') {
        resize(false);
    }
    graph.node.classed('selected', false);
    selected = {};
    highlightObject(null);
}

function highlightObject(obj) {
    if (obj) {
        if (obj !== highlighted) {
            graph.node.classed('inactive', function(d) {
                return (obj !== d
                     && d.depends.indexOf(obj.name) == -1
                     && d.dependedOnBy.indexOf(obj.name) == -1);
            });
            graph.line.classed('inactive', function(d) {
                return (obj !== d.source && obj !== d.target);
            });
        }
        highlighted = obj;
    } else {
        if (highlighted) {
            graph.node.classed('inactive', false);
            graph.line.classed('inactive', false);
        }
        highlighted = null;
    }
}

var showingDocs       = false,
    docsClosePadding  = 8,
    desiredDocsHeight = 300;

function resize(showDocs) {
    var docsHeight  = 0,
        graphHeight = 0,
        $docs       = $('#docs-container'),
        $graph      = $('#graph-container'),
        $close      = $('#docs-close');

    if (typeof showDocs == 'boolean') {
        showingDocs = showDocs;
        $docs[showDocs ? 'show' : 'hide']();
    }

    if (showingDocs) {
        docsHeight = desiredDocsHeight;
        $docs.css('height', docsHeight + 'px');
    }

    graphHeight = window.innerHeight - docsHeight;
    $graph.css('height', graphHeight + 'px');

    $close.css({
        top   : graphHeight + docsClosePadding + 'px',
        right : window.innerWidth - $docs[0].clientWidth + docsClosePadding + 'px'
    });
}
