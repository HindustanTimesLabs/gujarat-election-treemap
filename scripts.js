var width = d3.min([1200, window.innerWidth]), height = d3.min([600, window.innerHeight - 60]);
var svg = d3.select("#viz").append("svg").attr("width", width).attr("height", height);

var color = {
  "INC": "#91bfdb",
  "BJP": "#fc8d59"
}

var treemap = d3.treemap()
    .tile(d3.treemapResquarify)
    .size([width, height])
    .round(true)
    .paddingInner(5);

var slider_m = d3.marcon()
    .height(60)
    .width(500)
    .left(20)
    .right(20)
    .top(20)
    .bottom(20)
    .element("#slider");

slider_m.render();
var slider_width = slider_m.innerWidth(), slider_height = slider_m.innerHeight(), slider_svg = slider_m.svg();

var slider_x = d3.scaleBand()
    .range([0, slider_width]);

var slider_radius = slider_height / 1.5;

var slider_axis = d3.axisBottom(slider_x)

d3.json("tree.json", function(error, data) {
  if (error) throw error;

  // all years
  var years = Object.keys(data.children[0]).filter(function(k){ return k != "name" && k != "abbr"; });
  slider_x.domain(years);

  var curr_year = years[0];

  // slider rect
  slider_svg.append("rect")
      .attr("class", "slider-rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", slider_width)
      .attr("height", slider_height);

  slider_svg.append("g")
      .attr("class", "slider-axis")
      .attr("transform", "translate(0, " + slider_height + ")")
      .call(slider_axis)

  slider_svg.append("circle")
      .attr("class", "slider-circle")
      .attr("cx", slider_x(years[0]) + slider_height)
      .attr("cy", slider_height / 2)
      .attr("r", slider_height)
      .call(d3.drag().on("drag", slider_drag));

  var root = d3.hierarchy(data)
      .eachBefore(function(d) { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
      .sum(function(d){ return d[curr_year] })
      .sort(function(a, b) { return b.height - a.height || b.value - a.value; });

  treemap(root);

  var cell = svg.selectAll("g")
    .data(root.leaves())
    .enter().append("g")
      .attr("transform", calcTranslate);

  cell.append("path")
      .attr("id", function(d) { return d.data.id; })
      .attr("d", function(d) { return rectToRounded(d.x1 - d.x0, d.y1 - d.y0); })
      .style("fill", function(d) { return color[d.data.abbr]; });

  var txt = cell.append("text")
      .attr("class", "cell-text")
      .attr("dy", 10)
      .attr("transform", calcTextRotate)
      .attr("x", calcVertTextX)
      .attr("y", calcVertTextY)
      .attr("dy", "0")
      .style("text-anchor", "middle")
      .text(calcText)

  // slider
  function slider_drag(d){

    // position of slider
    var domain_l = slider_x.domain().length - 1;
    var x_pos = d3.event.x < 0 ? 0 :
      d3.event.x > slider_width ? slider_width :
      d3.event.x;

    var index = Math.round(x_pos / slider_width * domain_l);
    var val = slider_x.domain()[index];

    var cx = slider_x(val) + slider_height;

    d3.select(".slider-circle")
        .attr("cx", cx);

    // have to send val to the chart
    if (val != curr_year){

      curr_year = val;

      treemap(root.sum(function(d){ return d[val]; }))

      cell.transition()
          .attr("transform", calcTranslate)
        .select("path")
          .attr("d", function(d) { return rectToRounded(d.x1 - d.x0, d.y1 - d.y0); })
      
      cell.transition()
          .attr("transform", calcTranslate)
        .select("text")
          .attr("dy", 10)
          .attr("transform", calcTextRotate)
          .attr("x", calcVertTextX)
          .attr("y", calcVertTextY)
          .text(calcText)
    }
    
  }
});

function calcVertTextX(d){
  var w = d.x1 - d.x0;
  var h = d.y1 - d.y0;
  return w > h ? calcTextX(d) :
    h > w ? calcTextY(d) :
    calcTextX(d);
}

function calcVertTextY(d){
  var w = d.x1 - d.x0;
  var h = d.y1 - d.y0;
  return w > h ? calcTextY(d) :
    h > w ? -calcTextX(d) :
    calcTextY(d);
}

function calcTextRotate(d){
  var w = d.x1 - d.x0;
  var h = d.y1 - d.y0;
  return w > h ? "rotate(0)" :
    h > w ? "rotate(90)" :
    ""
}

function calcText(d){
  return (d.x1 - d.x0 == 0 || d.y1 - d.y0 == 0 || isNaN(d.x1 - d.x0) || isNaN(d.y1 - d.y0)) ? "" : d.data.name;
}

function calcTextX(d){
  return isNaN(d.x1) || isNaN(d.x0) ? 0 : (d.x1 - d.x0) / 2;
}

function calcTextY(d){
  return isNaN(d.y1) || isNaN(d.y0) ? 0 : (d.y1 - d.y0) / 2;
}

function calcTranslate(d){
  return isNaN(d.x0) || isNaN(d.y0) ? "translate(0, 0)" : "translate(" + d.x0 + "," + d.y0 + ")";
}

// w and h are necessary
function rectToPath(w, h, x, y){
  x = x ? x : 0;
  y = y ? y : 0;
  return "M" + x + "," + y + " H" + w + " V" + h + " H" + x + " Z";
}

function rectToRounded(w, h, x, y){
  var r = 5;
  r = h < r || h < r ? d3.min([w, h]) : r;
  x = x ? x : 0;
  y = y ? y : 0;
  
  var a = "M" + (x + r) + "," + y;
  var b = "H" + (w - r);
  var c = "C" + (w - r) + "," + y + " " + w + "," + y + " " + w + "," + (y + r);
  var d = "V" + (h - r);
  var e = "C" + w + "," + (h - r) + " " + w + "," + h + " " + (w - r) + "," + h;
  var f = "H" + (x + r);
  var g = "C" + (x + r) + "," + h + " " + x + "," + h + " " + x + "," + (h - r);
  var h0 = "V" + (y + r);
  var i = "C" + x + "," + (y + r) + " " + x + "," + y + " " + (x + r) + "," + y;

  var out = isNaN(w) || isNaN(h) ? "" : a + " " + b + " " + c + " " + d + " " + e + " " + f + " " + g + " " + h0 + " " + i;

  
  return out
}
