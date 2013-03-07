/* Diagramr special Raphael drawing functions
 *
 * Alex Burka, October 2011
 * updated Jordan Singleton 2012
 */

// measure font height
// http://eriwen.com/?p=40
function getEmSize(el)
{
  return Number(getComputedStyle(el, '').fontSize.match(/(\d+)px/)[1]);
}

// round to specified number of decimal places
function round(n, d)
{
  var factor = Math.pow(10, d);
  return Math.round(n*factor)/factor;
}

// move a load/support, after updating its options dict
// parameters:
//  - thing: a child of the load/support set
//  - creat: the function to create a new one (input.load or input.support)
//  - upd: function to update the options dict
function redraw(thing, creat, upd)
{
  var l = thing.parent(), b = l.parent(), o = upd(deepcopy(l._o));
  var n = creat(o, l._d);
  n.id = l.id;
  Raphael._sets[l.id] = n;
  b.push(n);
  b.exclude(l);
  l.remove();
  return n;
}

// draw the wall for a cantilever beam
Raphael.fn.wall = function () {
  var x = input.width*(BEAM_X + BEAM_W),
      y = input.height*(BEAM_Y - BEAM_H/2),
      w = input.width*(0.1*BEAM_X),
      h = input.height*(2*BEAM_H);

  var wall = input.set();
  wall.push(
      input.rect(x, y, w/2, h)
      .attr("fill", "blue"),

      input.path("m" + (x+w/2) + "," + y

        + "l" + (w/2)  + "," + (h/10)

        + "m" + -w/2   + "," + 0
        + "l" + (w/2)  + "," + (h/10)

        + "m" + -w/2   + "," + 0
        + "l" + (w/2)  + "," + (h/10)

        + "m" + -w/2   + "," + 0
        + "l" + (w/2)  + "," + (h/10)

        + "m" + -w/2   + "," + 0
        + "l" + (w/2)  + "," + (h/10)

        + "m" + -w/2   + "," + 0
        + "l" + (w/2)  + "," + (h/10)

        + "m" + -w/2   + "," + 0
        + "l" + (w/2)  + "," + (h/10)

        + "m" + -w/2   + "," + 0
        + "l" + (w/2)  + "," + (h/10)

        + "m" + -w/2   + "," + 0
        + "l" + (w/2)  + "," + (h/10)

        + "m" + -w/2   + "," + 0
        + "l" + (w/2)  + "," + (h/10))
        );

  if (beam.data("mode") == "overhanging")
  {
    wall.hide();
  }

  wall.type = "wall";
  return wall;
};

// draw a beam support
//  parameters:
//    - o (required): options dict
//      type (required): support type. currently "pinned" or "roller"
//      position (required): position along the beam, in meters
//    - d (optional): drag handler array
//      d[0] = onmove, d[1] = onstart, d[2] = onend
//  returns: support element
//    type: support_{o.type}
//    data: "position", in meters
Raphael.fn.support = function (o, d) {
  var supp = input.set();
  supp._o = o;
  supp._d = d;

  var type = o.type, position = o.position;

  var x = position*SCALE/beam.len() + input.width*BEAM_X;
  var y = input.height*(BEAM_Y + BEAM_H);
  var w = input.width*BEAM_W / 20;
  var h = input.height*BEAM_H * 2/3;
  var r = w/10;

  if (typeof d != "undefined")
  {
    supp.push(
        input.rect(x-w/2, y, w, h)
        .attr("fill", "black")
        .attr("opacity", 0)
        .attr("cursor", "move")
        .drag(d[0], d[1], d[2])
        );
  }

  supp.push(
      input.path("m" + x     + "," + y
        + "l" + w/2 + "," + (type == "roller" ? h-2*r : h)
        + " " + (-w) + "," + 0
        + "z")
      );

  y += (type == "roller" ? h-2*r : h);
  x -= w/2;

  if (type == "roller")
  {
    supp.push(
        input.circle(x + 2*r, y+r, r),
        input.circle(x + 5*r, y+r, r),
        input.circle(x + 8*r, y+r, r),
        input.path("m" + x   + "," + (y+2*r)
          + "h" + w)
        );

    y += 2*r;
  }

  supp.push(
      input.path("m" + x    + "," + y
        + "l" + (-r)   + "," + r

        + "m" + (3*r)  + "," + (-r)
        + "l" + (-r)  + "," + r

        + "m" + (3*r)  + "," + (-r)
        + "l" + (-r)  + "," + r

        + "m" + (3*r)  + "," + (-r)
        + "l" + (-r)  + "," + r

        + "m" + (3*r)  + "," + (-r)
        + "l" + (-r)  + "," + r

        + "m" + (3*r)  + "," + (-r)
        + "l" + (-r)  + "," + r)
      );

  supp.push(
      input.text(x + w/2, y + r + EM, round(position,3) + " m").click(function ()
        {
          var val = parseFloat(prompt("New value for position (m):", o.position));
          if (!isNaN(val))
      {
        var type = this.parent()._o.type, from = this.parent()._o.position, to = val;
        OOPS.action("move " + type + " support from x=" + from + " to x=" + to,
          function (supp)
          {
            return redraw(supp[0],
              input.support,
              function (o)
              {
                o.position = to; return o;
              });
          },
          function (supp)
          {
            return redraw(supp[0],
              input.support,
              function (o)
              {
                o.position = from; return o;
              });
          },
          this.parent());
      }
        })
  );

  supp.attr("fill", "blue");
  supp.type = "support_" + type;
  supp.data("position", position);
  supp[0].toFront(); // drag box above

  if (beam.data("mode") == "cantilever")
  {
    supp.hide();
  }

  return supp;
};

// draw a beam load
//  parameters:
//    - o (required): options dict
//      type (required): load type. currently "concentrated",
//                                            "distributed-constant",
//                                            "distributed-linear"
//        concentrated: o.position
//        distributed-*: o.start, o.length
//        all types: o.mag (not required in mini mode)
//      mode (optional): affects the drawing
//        "mini": use o.x/o.y/o.w/o.h to draw the support in the place specified
//        "ghost": draw normally, but with greater arrow spacing (much faster)
//        default: draw normally
//    - d (optional): drag handler array
//      for just move: d[0] = onmove, d[1] = onstart, d[2] = onend
//      for resize as well: d[3..5] for left, d[6..8] for right
//  returns: support element
//    type: support_{o.type}
//    data: "position", in meters
Raphael.fn.load = function (o, d)
{
  /* install drag box and handler functions
   * o: load parameters
   * d: drag handler funcs
   * x/y/w/h: position of the load
   */
  function install_handles(o, d, x, y, w, h)
  {
    switch (d.length)
    {
      case 3:
        load.push(input.rect(x, y-h, w, h)
            .attr({
              opacity: 0,
            fill: "black",
            cursor: o.mode == "mini" ? "s-resize" : "move"})
            .drag(d[0], d[1], d[2])
            );
        break;
      case 9:
        if (o.resizeable == false)
        {
          return install_handles(o, d.slice(0, 3), x, y, w, h);
        }
        load.push(input.rect(x, y-h, w, h)
            .attr({
              opacity: 0,
              fill: "black",
              cursor: o.mode == "mini" ? "s-resize" : "move"})
            .drag(d[0], d[1], d[2]),
            input.rect(x, y-h, w/5, h)
            .attr({
              opacity: 0,
            fill: "black",
            cursor: "w-resize"})
            .drag(d[3], d[4], d[5]),
            input.rect(x+w*4/5, y-h, w/5, h)
            .attr({
              opacity: 0,
            fill: "black",
            cursor: "e-resize"})
            .drag(d[6], d[7], d[8])
            );
        break;
      default:
        console.log("weird number of drag handlers");
        break;
    }
  }

  function distributed(start, end, length, y, h, units)
  {
    load.data("start", (start - input.width*BEAM_X)/SCALE*beam.len());
    load.data("end", (end - input.width*BEAM_X)/SCALE*beam.len());
    load.push(
        input.text(start + length/2, y - h - EM, o.mag + " " + units).click(function ()
          {
            var val = parseFloat(prompt("New value for magnitude (" + units + "):", o.mag));
            if (!isNaN(val))
        {
          var type = this.parent()._o.type, from = this.parent()._o.mag, to = val;
          if (val == 0)
        {
          delete_load(this.parent());
        }
          else
        {
          OOPS.action("change magnitude of " + type + " load from " + from + " to " + to,
            function (loadid)
            {
              return redraw(input.setById(loadid)[0],
                input.load,
                function (o)
                {
                  o.mag = to;
                  return o;
                }).id;
            },
            function (loadid)
            {
              return redraw(input.setById(loadid)[0],
                input.load,
                function (o)
                {
                  o.mag = from;
                  return o;
                }).id;
            },
            this.parent().id);
        }
        }
          }),
      input.text(start, y + EM, round(o.position, 2) + " m >").click(function ()
          {
            var str = prompt("New value for start (m): (prepend '=' to keep length)", o.position);
            if (str !== null && str.length != 0)
      {
        if (str.charAt(0) == '=')
      {
        var val = parseFloat(str.substr(1));
        if (!isNaN(val))
      {
        var type = this.parent()._o.type, from = this.parent()._o.position, to = val;
        OOPS.action("move left side of " + o.type + " load from x="
          + from + " to x=" + to + " (preserving length)",
          function (loadid)
          {
            return redraw(input.setById(loadid)[0],
              input.load,
              function (o)
              {
                o.position = to;
                return o;
              }).id;
          },
          function (loadid)
          {
            return redraw(input.setById(loadid)[0],
              input.load,
              function (o)
              {
                o.position = from;
                return o;
              }).id;
          },
          this.parent().id);
      }
      }
        else
        {
          var val = parseFloat(str);
          if (!isNaN(val))
          {
            var type = this.parent()._o.type,
                frompos = this.parent()._o.position,
                fromlen = this.parent()._o.length,
                to = val;
            OOPS.action("move left side of " + type + " load from x=" + frompos
                + " to x=" + to + " (resizing)",
                function (loadid)
                {
                  return redraw(input.setById(loadid)[0],
                    input.load,
                    function (o)
                    {
                      o.length += o.position - to;
                      o.position = to;
                      return o;
                    }).id;
                },
                function (loadid)
                {
                  return redraw(input.setById(loadid)[0],
                    input.load,
                    function (o)
                    {
                      o.length = fromlen;
                      o.position = frompos;
                      return o;
                    }).id;
                },
              this.parent().id);
          }
        }
      }
          }).attr("text-anchor", "start"),
      input.text(start + length/2, y + EM*2.5, "<|  " + round(o.length, 2) + " m  |>")
        .click(function ()
            {
              var val = parseFloat(prompt("New value for length (m):", o.length));
              if (!isNaN(val))
        {
          var type = this.parent()._o.type, from = this.parent()._o.length, to = val;
          OOPS.action("resize " + type + " load from L=" + from + " to L=" + to,
            function (loadid)
            {
              return redraw(input.setById(loadid)[0],
                input.load,
                function (o)
                {
                  o.length = to;
                  return o;
                }).id;
            },
            function (loadid)
            {
              return redraw(input.setById(loadid)[0],
                input.load,
                function (o)
                {
                  o.length = from;
                  return o;
                }).id;
            },
            this.parent().id);
        }
            }),
      input.text(start + length, y + EM*4, "< " + round(o.position + o.length, 2) + " m")
        .click(function ()
            {
              var str = prompt("New value for end (m): (prepend '=' to keep length)",
                o.position + o.length);
              if (str !== null && str.length != 0)
        {
          if (str.charAt(0) == '=')
        {
          var val = parseFloat(str.substr(1));
          if (!isNaN(val))
        {
          var type = this.parent()._o.type, from = this.parent()._o.position;
          OOPS.action("move end of " + type + " load by dx=" + val
            + " (length-preserving)",
            function (loadid)
            {
              return redraw(input.setById(loadid)[0],
                input.load,
                function (o)
                {
                  o.position = val -  o.length; return o;
                }).id;
            },
            function (loadid)
            {
              return redraw(input.setById(loadid)[0],
                input.load,
                function (o)
                {
                  o.position = from;
                  return o;
                }).id;
            },
            this.parent().id);
        }
        }
          else
          {
            var val = parseFloat(str);
            if (!isNaN(val))
            {
              var type = this.parent()._o.type, from = this.parent()._o.length;
              OOPS.action("move end of " + type + " load by dx=" + val + " (resizing)",
                  function (loadid)
                  {
                    return redraw(input.setById(loadid)[0],
                      input.load,
                      function (o)
                      {
                        o.length = val -  o.position;
                        return o;
                      }).id;
                  },
                  function (loadid)
                  {
                    return redraw(input.setById(loadid)[0],
                      input.load,
                      function (o)
                      {
                        o.length = from;
                        return o;
                      }).id;
                  },
                this.parent().id);
            }
          }
        }
            }).attr("text-anchor", "end")
    );
  }

  var load = input.set();
  load._o = o;
  load._d = d;

  switch (o.type)
  {
    case "concentrated":
      var x = o.mode == "mini" ? o.x : input.width*BEAM_X + o.position*SCALE/beam.len();
      var h = o.mode == "mini" ? o.h : input.height*BEAM_H*3/2;
      var y = o.mode == "mini" ? o.y : input.height*BEAM_Y - h/20;
      var w = h*2/9;
      load.push(
          input.arrow(x, y - h, x, y)
          );
      if (o.mode != "mini")
      {
        load.data("position", o.position);
        load.push(
            input.text(x, y - h - EM, o.mag + " N").click(function ()
              {
                var val = parseFloat(prompt("New value for magnitude (N):", o.mag));
                if (!isNaN(val))
            {
              var type = this.parent()._o.type, from = this.parent()._o.mag;
              if (val == 0)
            {
              delete_load(this.parent());
            }
              else
            {
              OOPS.action("change magnitude of " + type + " load from "
                + from + " to " + val,
                function (loadid)
                {
                  return redraw(input.setById(loadid)[0],
                    input.load,
                    function (o)
                    {
                      o.mag = val;
                      return o;
                    }).id;
                },
                function (loadid)
                {
                  return redraw(input.setById(loadid)[0],
                    input.load,
                    function (o)
                    {
                      o.mag = from;
                      return o;
                    }).id;
                },
                this.parent().id);
            }
            }
              }),
          input.text(x, y + EM, round(o.position, 3) + " m").click(function ()
              {
                var val = parseFloat(prompt("New value for position (m):", o.position));
                if (!isNaN(val))
          {
            var type = this.parent()._o.type, from = this.parent()._o.position;
            OOPS.action("move " + type + " load from x=" + from + " to x=" + val,
              function (loadid)
              {
                return redraw(input.setById(loadid)[0],
                  input.load,
                  function (o)
                  {
                    o.position = val;
                    return o;
                  }).id;
              },
              function (loadid)
              {
                return redraw(input.setById(loadid)[0],
                  input.load,
                  function (o)
                  {
                    o.position = from;
                    return o;
                  }).id;
              },
              this.parent().id);
          }
              })
        );
      }
      if (typeof d != "undefined")
      {
        install_handles(o, d, x-w*2, y, w*4, h);
      }
      break;
    case "moment":
      var x = o.mode == "mini" ? o.x   : input.width*BEAM_X + o.position*SCALE/beam.len();
      var h = o.mode == "mini" ? o.h   : input.height*BEAM_H*4/5;
      var w = h;
      var y = o.mode == "mini" ? o.y-h/2 : input.height*BEAM_Y + input.height*BEAM_H/2;

      if (o.mode == "mini" || o.mag >= 0)
      {
        load.push(
            input.path("m" + (x+w/2) + "," + y
              + "a" + (w/2) + "," + (h/2) + ",0,1,0," + (-w/2) + "," + (h/2))
            .attr("arrow-end", "block-wide-long")
            .attr("fill-opacity", "0"),
            input.circle(x, y, w/15).attr("fill", "black")
            );
      }
      else
      {
        // curl the other way if negative
        load.push(
            input.path("m" + (x-w/2) + "," + y
              + "a" + (w/2) + "," + (h/2) + ",0,1,1," + (w/2) + "," + (h/2))
            .attr("arrow-end", "block-wide-long")
            .attr("fill-opacity", "0"),
            input.circle(x, y, w/15).attr("fill", "black")
            );
      }

      if (o.mode != "mini")
      {
        load.data("position", o.position);
        load.push(
            input.text(x, y - input.height*BEAM_H*2/3, o.mag + " Nm")
            .click(function ()
              {
                var val = parseFloat(prompt("New value for magnitude (N):", o.mag));
                if (!isNaN(val))
            {
              var type = this.parent()._o.type, from = this.parent()._o.mag;
              if (val == 0)
            {
              delete_load(this.parent());
            }
              else
            {
              OOPS.action("change magnitude of " + type + " load from "
                + from + " to " + val,
                function (loadid)
                {
                  return redraw(input.setById(loadid)[0],
                    input.load,
                    function (o)
                    {
                      o.mag = val;
                      return o;
                    }).id;
                },
                function (loadid)
                {
                  return redraw(input.setById(loadid)[0],
                    input.load,
                    function (o)
                    {
                      o.mag = from;
                      return o;
                    }).id;
                },
                this.parent().id);
            }
            }
              }),
          input.text(x, y + input.height*BEAM_H*2/3, round(o.position, 3) + " m")
            .click(function ()
                {
                  var val = parseFloat(prompt("New value for position (m):", o.position));
                  if (!isNaN(val))
            {
              var type = this.parent()._o.type, from = this.parent()._o.position;
              OOPS.action("move " + type + " load from x=" + from + " to " + val,
                function (loadid)
                {
                  return redraw(input.setById(loadid)[0],
                    input.load,
                    function (o)
                    {
                      o.position = val;
                      return o;
                    }).id;
                },
                function (loadid)
                {
                  return redraw(input.setById(loadid)[0],
                    input.load,
                    function (o)
                    {
                      o.position = from;
                      return o;
                    }).id;
                },
                this.parent().id);
            }
                })
        );
      }
      if (typeof d != "undefined")
      {
        install_handles(o, d, x-w/2, y+h/2, w, h);
      }
      break;
    case "distributed-constant":
      var x = o.mode == "mini" ? o.x : input.width*BEAM_X + o.position*SCALE/beam.len();
      var h = o.mode == "mini" ? o.h : input.height*BEAM_H;
      var y = o.mode == "mini" ? o.y : input.height*BEAM_Y - h/20;

      var start = x;
      var end = x + (o.mode == "mini" ? o.w : o.length*SCALE/beam.len());
      var length = end - start;
      var tick = length / Math.ceil(length / (o.mode == "ghost" ? 50 : 15));

      load.push(
          input.path("m" + x + "," + (y - h)
            + "h" + length)
          );
      for (x = start; x < (end+tick/2); x += tick)
      {
        load.push(
            input.arrow(x, y - h, x, y)
            );
      }

      if (o.mode != "mini")
      {
        distributed(start, end, length, y, h, "N/m");
      }
      if (typeof d != "undefined")
      {
        install_handles(o, d, start, y, length, h);
      }
      break;
    case "distributed-linear":
      var x = o.mode == "mini" ? o.x : input.width*BEAM_X + o.position*SCALE/beam.len();
      var h = o.mode == "mini" ? o.h : input.height*BEAM_H;
      var y = o.mode == "mini" ? o.y : input.height*BEAM_Y - h/20;

      var start = x;
      var end = x + (o.mode == "mini" ? o.w : o.length*SCALE/beam.len());
      var length = end - start;
      var tick = length / Math.ceil(length / (o.mode == "ghost" ? 50 : 15));

      if (o.mode == "mini" || o.mag >= 0)
      {
        load.push(
            input.path("m" + x + "," + y
              + "l" + length + "," + (-h))
            );
        for (x = start+tick; x < (end+tick/2); x += tick)
        {
          load.push(
              input.arrow(x, y - h*(x-start)/length, x, y)
              );
        }
      }
      else
      { // slope the other way if negative
        load.push(
            input.path("m" + x + "," + (y-h)
              + "l" + length + "," + h)
            );
        for (x = start; x < end; x += tick)
        {
          load.push(
              input.arrow(x, y - h*(end-x)/length, x, y)
              );
        }
      }

      if (o.mode != "mini")
      {
        distributed(start, end, length, y, h, "N/m/m");
      }
      if (typeof d != "undefined")
      {
        install_handles(o, d, start, y, length, h);
      }
      break;
    default:
      console.log("unsupported load type " + o.type);
  }

  load.attr("fill", "black");
  load.type = "load_" + o.type;
  if (o.mode != "mini") load.data("mag", o.mag);
  return load;
};


function eval_function(label){
  var s, h;
  var fn;
  if(label.indexOf("Deflection") == 0){
    s = "y(x) = ";
    h = "Deflection";
    fn = deflection;
  }else{
    s = label + " = ";
    h = label;
    if(label == "M(x)") fn = moment;
    if(label == "V(x)") fn = shear;
  }
  var plus = 0;
  for (var term in fn)
  {
    if (fn.hasOwnProperty(term))
    {
      if(plus) s+=" + ";
      plus = 1;
      s += round(-fn[term][0], 7)
        + "<x - " + round(fn[term][1], 3) + " >^"
        + round(fn[term][2], 3);
    }
  }
  var x = prompt("Singularity Function for " + h + ":\n\n" +
      s + "\n\n\nEnter x value to evaluate:",0);
  if(x == null) return;
  x = parseFloat(x);
  if(isNaN(x) || x<0 || x>beam.len()){
    alert("Must enter a valid number, within bounds of beam");
    return;
  }

  function value(fn, x)
  {
    var val = 0;
    for (var term in fn)
    {
      if (fn.hasOwnProperty(term))
      {
        if (x >= fn[term][1] && fn[term][2] >= 0)
        {
          val += fn[term][0] * Math.pow(x - fn[term][1], fn[term][2]);
        }
      }
    }
    return val;
  }
  var val = -value(fn,x);
  alert(s.substring(0,2) + x + ") = " + val);


}


function draw_singularity(fns, length, reactions, labels)
{
  colors = ["#ff0000", "#00ff00", "#0000ff"];

  var maxy = [], maxx = [];

  function value(fn, x)
  {
    var val = 0;
    for (var term in fn)
    {
      if (fn.hasOwnProperty(term))
      {
        if (x >= fn[term][1] && fn[term][2] >= 0)
        {
          val += fn[term][0] * Math.pow(x - fn[term][1], fn[term][2]);
        }
      }
    }

    return val;
  }

  output.clear();

  var POINTS = 500;
  var x = Array(POINTS+1), y = Array(fns.length), zero = Array(POINTS+1);
  for (var j = 0; j < fns.length; ++j) {
    y[j] = Array(POINTS+1); 
    maxy[j] = 0;
    maxx[j] = 0;
  }
  for (var i = 0; i <= POINTS; i++)
  {
    x[i] = i*length/POINTS;
    zero[i] = 0;
    for (var j = 0; j < fns.length; ++j)
    {
      y[j][i] = -value(fns[j], x[i]);
      if(Math.abs(y[j][i]) >= Math.abs(maxy[j])){
        maxy[j] = y[j][i];
        maxx[j] = x[i];
      }
      if(labels[j] == "Deflection"){
        y[j][i] *= 1000000;
      }
    }
  }

  for (var j = 0; j < fns.length; ++j)
  {
    output.linechart(output.width*BEAM_X,
        output.height*.1 + j*output.height*.8/fns.length,
        output.width*BEAM_W,
        output.height*.8 / fns.length,
        [x, x], [y[j], zero],
        {axis:   "0 1 1 1",
          colors: [colors[j], "black"]});


    //display labels
    if(labels[j] == "Deflection"){
      output.text(output.width*(BEAM_X*0.4),
          output.height*.3 + j*output.height*.8/fns.length,
          labels[j] + "\n*10^6").click(function () {
        eval_function(this.attr("text")); 
      });
      output.text(output.width*(BEAM_X/2 + BEAM_W/2 + 1/2),
          output.height*.3 + j*output.height*.8/fns.length,
          "Max " + labels[j] + ":\ny(" +
          maxx[j].toPrecision(4) + ") = " + maxy[j].toPrecision(4))
        .attr("text-anchor","middle");
    }else{
      output.text(output.width*(BEAM_X*0.4),
          output.height*.3 + j*output.height*.8/fns.length,
          labels[j]).click(function () {
        eval_function(this.attr("text")); });
    }
    if(labels[j] != "Deflection"){
      output.text(output.width*(BEAM_X/2 + BEAM_W/2 + 1/2),
          output.height*.3 + j*output.height*.8/fns.length - 25,
          "Max " + labels[j] + ":\n" + labels[j].substring(0,2) +
          maxx[j].toPrecision(4) + ") = " + maxy[j].toPrecision(4))
        .attr("text-anchor","middle");
      if(labels[j] == "V(x)"){
        var maxs = calc_shearst(maxy[j]);
        var on = "";
        var num;
        if(maxs[1]){
          num = maxs[0];
          on = " on " + maxs[1];
        }else{num=maxs; }
        output.text(output.width*(BEAM_X/2 + BEAM_W/2 + 1/2),
            output.height*.3 + j*output.height*.8/fns.length,
            "Max Shear Stress:\n" + num.toPrecision(4) + on)
          .attr("text-anchor","middle");
      }else{
        var maxm = calc_normst(maxy[j]);
        output.text(output.width*(BEAM_X/2 + BEAM_W/2 + 1/2),
            output.height*.3 + j*output.height*.8/fns.length,
            "Max Normal Stress:\n" + maxm.toPrecision(4))
          .attr("text-anchor","middle");
      }
    }
  }

  if (typeof reactions != "undefined")
  {
    output.text(output.width * BEAM_X, 5, 
        "Ra: " + round(reactions[0], 3)
        + "     \t      Rb: " + round(reactions[1], 3))
      .attr("text-anchor","start");
  }
}

