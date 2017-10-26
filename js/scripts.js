var mob = isMobile.any;

var width = d3.min([850, window.innerWidth - 10]), height = width / 2;
var svg = d3.select("#viz").append("svg").attr("width", width).attr("height", height);

var color = {
  "INC": "#2880b9",
  "BJP": "#e27a3f",
  "BJS": "#ffb992",
  "NCO": "#71afd8",
  "INC(I)": "#71afd8"
}

var playing = true;

var treemap = d3.treemap()
    .tile(d3.treemapResquarify)
    .size([width, height])
    .round(true)
    .paddingInner(5);

var slider_m = d3.marcon()
    .height(60)
    .width(d3.min([500, window.innerWidth - 10]))
    .left(20)
    .right(20)
    .top(10)
    .bottom(20)
    .element("#slider");

slider_m.render();
var slider_width = slider_m.innerWidth(), slider_height = slider_m.innerHeight(), slider_svg = slider_m.svg();

var slider_bar_height = 10;

var slider_x = d3.scaleBand()
    .range([0, slider_width]);

var slider_radius = slider_height / 1.5;

var slider_axis = d3.axisBottom()
  .scale(slider_x)
  .tickFormat(function(d, i){ 
    if (mob) {
      return i == 0 ? d : 
        d == "2002" ? d :
        "'" + jz.str.keepEnd(d, 2)
    } else {
      return d;
    }
    
  })

d3.json("data/tree.json", function(error, data) {
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
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("width", slider_width)
      .attr("height", slider_bar_height);

  slider_svg.append("g")
      .attr("class", "slider-axis")
      .attr("transform", "translate(0, " + 20 + ")")
      .call(slider_axis)

  slider_svg.append("circle")
      .attr("class", "slider-circle")
      .attr("cx", slider_x(years[0]) + (slider_x.step() / 2))
      .attr("cy", slider_bar_height / 2)
      .attr("r", slider_bar_height)
      .call(d3.drag().on("drag", function(){
        if (!playing) slider_drag()
        
      }));

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

  cell.append("text")
      .attr("class", function(d){ return "cell-text " + jz.str.toSlugCase(d.data.name) })
      .attr("dy", 8)
      .attr("transform", calcTextRotate)
      .attr("x", calcVertTextX)
      .attr("y", calcVertTextY)
      .style("text-anchor", "middle")
      .text(calcText)
      .style("font-size", calcFontSize);

  // auto play
  autoPlay();
  $(document).on("mouseleave", "#viz svg", revive);
  $(document).on("click", ".play.paused", revive);
  function revive(){
    if (!playing){

      playing = true;
      $(".play").removeClass("paused").addClass("playing").html("<i class='fa fa-pause' aria-hidden='true'></i> Pause");
      $(".slider-circle").css("cursor", "default");
      playStep(); // play a step first
      autoPlay();
    }
  }

  function autoPlay(){

    var interval = d3.interval(playStep, 1500)

    $(document).on("mouseenter", "#viz", kill);
    $(document).on("click", ".play.playing", kill);

    function kill(){
      playing = false;
      $(".play").removeClass("playing").addClass("paused").html("<i class='fa fa-play' aria-hidden='true'></i> Play")
      $(".slider-circle").css("cursor", "ew-resize");
      interval.stop();
    }

  }

  function playStep(){
    var curr_index = getIndex(curr_year);
    var new_index = curr_index == years.length - 1 ? 0 : curr_index + 1;
    var new_year = years[new_index];
    update(new_year);

    // update the slider position
    var cx = slider_x(new_year) + (slider_x.step() / 2);

    d3.select(".slider-circle")
        .attr("cx", cx);

    curr_year = new_year;

    function getIndex(year){
      return years.indexOf(curr_year);
    }
  }


  // slider
  function slider_drag(){

    // position of slider
    var domain_l = slider_x.domain().length - 1;
    var x_pos = d3.event.x < 0 ? 0 :
      d3.event.x > slider_width ? slider_width :
      d3.event.x;

    var index = Math.round(x_pos / slider_width * domain_l);
    var val = slider_x.domain()[index];

    var cx = slider_x(val) + (slider_x.step() / 2);

    d3.select(".slider-circle")
        .attr("cx", cx);

    // have to send val to the chart
    if (val != curr_year){

      update(val);      
          
    }
    
  }

  // update is in the data scope
  function update(val){
    // update the text
    d3.select(".main-viz-title").html(val);

    curr_year = val;

    treemap(root.sum(function(d){ return d[val]; }))

    cell.transition()
        .attr("transform", calcTranslate)
      .select("path")
        .attr("d", function(d) { return rectToRounded(d.x1 - d.x0, d.y1 - d.y0); })
    
    cell.transition()
        .attr("transform", calcTranslate)
      .select("text")
        .attr("transform", calcTextRotate)
        .attr("x", calcVertTextX)
        .attr("y", calcVertTextY)
        .text(calcText)
        .style("font-size", function(d){
          d3.timeout(function(){
            return calcFontSize(d);  
          }, 0);
        })
    }
});


function calcFontSize(d){

  var el = d3.select(".cell-text." + jz.str.toSlugCase(d.data.name));

  var w = d.x1 - d.x0;
  var h = d.y1 - d.y0;
  var orientation = w > h ? "landscape" : "portrait";

  var bbox = el.node().getBBox();
  var ratio = (20 + bbox.width) / (orientation == "landscape" ? w : h);// 20 is for the padding
  var ratio_h = (20 + bbox.height) / (orientation == "landscape" ? h : w);// 20 is for the padding

  var curr_size = pxToNum(el.style("font-size"));
  var new_size = curr_size / ratio;

  // font size!
  if (w == 0 || h == 0 || isNaN(w) || isNaN(h) || (ratio_h > 1 && d.data.abbr != "BJP")){ 
    el.text("");
  } else if (ratio > 1){
    el.text(d.data.abbr + ", " + d.data[d3.select(".main-viz-title").text()] + "");
  } else {
    el.text(d.data.name + ", " + d.data[d3.select(".main-viz-title").text()] + "");
  }

  // now we deal with vertical positioning


  function pxToNum(sz){
    return +sz.split("px")[0];
  }

}

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











// BAR CHART

makeBar();
// $(window).smartresize(makeBar)
function makeBar(){

  var res = {
    height_divide: mob ? 1.5 : 2,
    bar_pad: mob ? .5 : .25,
    txt_fixed: mob ? 0 : 1
  }


  $("#stacked").empty();
  var color = {
    "Indian National Congress": "#2880b9",
    "Bharatiya Janata Party": "#e27a3f",
    "Congress faction": "#71afd8",
    "BJP predecessor": "#ffb992",
    "Other": "#eee"
  }

  var x_var = "year";
  var outer_width = d3.min([850, window.innerWidth - 10]);

  var setup = d3.marcon()
      .top(20)
      .bottom(20)
      .left(0)
      .right(mob ? 1 : 0)
      .width(outer_width)
      .height(outer_width / res.height_divide)
      .element("#stacked");

  setup.render();

  var width = setup.innerWidth(), height = setup.innerHeight(), svg = setup.svg();

  var x = d3.scaleBand()
      .rangeRound([0, width])
      .padding(res.bar_pad);

  var y = d3.scaleLinear()
      .rangeRound([height, 0]);

  var x_axis = d3.axisBottom(x)
      .tickFormat(function(d, i){ 
        if (mob) {
          return i == 0 ? d : 
            d == "2002" ? d :
            "'" + jz.str.keepEnd(d, 2)
        } else {
          return d;
        }
        
      })

  var y_axis = d3.axisRight(y)
    .tickSize(width);

  var stack = d3.stack()
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

  d3.queue()
      .defer(d3.csv, "data/seatshare.csv")
      .defer(d3.csv, "data/votes.csv")
      .await(ready);

  function ready(error, seatshare, votes){

    var obj = {
      seats: seatshare,
      votes: votes
    }

    var keys = makeKeys(obj["seats"]);

    stack.keys(keys)
    x.domain(obj["seats"].map(function(d){ return d.year; }));
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(x_axis);

    svg.append("g")
        .attr("class", "y axis")
        .call(customYAxis);

    redraw(obj[$(".toggle-item.active").attr("data-which")], keys, $(".toggle-item.active").attr("data-which"));

    $(".toggle-item").click(function(){

      if (!$(this).hasClass("active")) {
        $(".toggle-item.active").removeClass("active");
        $(this).addClass("active");
        var n = $(".toggle-item.active").attr("data-which");
        redraw(obj[n], keys, n);
        $(".data-type").html(jz.str.removeLast(n, "s"))
      }

    });

  }

  function makeKeys(data){
    return Object.keys(data[0]).filter(function(d){ return d != x_var && d != "sum"; })
  }

  function redraw(data, keys, type){

    // update the y scale
    y.domain([0, d3.max(data.map(function(d){ return d.sum }))]);
    y_axis.tickFormat(function(d, i, ticks){ return i == ticks.length - 1 ? d + "% of " + type : d; });

    svg.select(".y")
      .transition()
        .call(customYAxis);

    // each data column (a.k.a "key" or "series") needs to be iterated over
    // the variable alphabet represents the unique keys of the stacks
    keys.forEach(function(key, key_index){
      
      var input_data = stack(data).filter(function(k){ return k.key == key })[0];

      var bar = svg.selectAll(".bar-" + jz.str.toSlugCase(key))
          .data(stack(data).filter(function(k){ return k.key == key })[0], function(d){ return d.data[x_var] + "-" + jz.str.toSlugCase(key); });

      var txt = svg.selectAll(".txt-" + jz.str.toSlugCase(key))
          .data(stack(data).filter(function(k){ return k.key == key })[0], function(d){ return d.data[x_var] + "-" + jz.str.toSlugCase(key); });

      bar
        .transition()
          .attr("x", function(d){ return x(d.data[x_var]); })
          .attr("y", function(d){ return y(d[1]); })
          .attr("height", function(d){ return y(d[0]) - y(d[1]); });

      txt
        .transition()
          .attr("x", function(d){ return x(d.data[x_var]) + x.bandwidth() / 2; })
          .attr("y", function(d){ return y(d[1]); })
          .text(calcText)

      bar.enter().append("rect")
          .attr("class", function(d){ return "bar bar-" + jz.str.toSlugCase(key); })
          .attr("x", function(d){ return x(d.data[x_var]); })
          .attr("y", function(d){ return y(d[1]); })
          .attr("height", function(d){ return y(d[0]) - y(d[1]); })
          .attr("width", x.bandwidth())
          .attr("fill", function(d){ return color[key]; })

      txt.enter().append("text")
          .attr("class", function(d){ return "txt txt-" + jz.str.toSlugCase(key); })
          .attr("x", function(d){ return x(d.data[x_var]) + x.bandwidth() / 2; })
          .attr("y", function(d){ return y(d[1]); })
          .attr("dy", mob ? 8 : 12)
          .text(calcText)
      
      function calcText(d){
        return (d.data[key] == "0" || y(d[0]) - y(d[1]) < 10 || (mob && key != "Indian National Congress" && key != "Bharatiya Janata Party")) ? null : Number(d.data[key]).toFixed(res.txt_fixed); 
      }

    });    

  }

  

  function customYAxis(g) {
    g.call(y_axis);
    g.selectAll(".tick:not(:first-of-type) line").attr("stroke", mob ? "#eee" : "#888").attr("stroke-dasharray", "2,2");
    g.selectAll(".tick text").attr("x", 4).attr("dy", -4);
  }
}