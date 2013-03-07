/* interface.js
 * Diagramr GUI
 *
 * original code:	Alex Burka, October 2011
 * modified:	Jordan Singleton, Fall 2012
 */


var shear, moment, deflection;


function draw() {
  function doit()
  {
    //alert("doit");
    update_url();
    var json = beam.encode(),
        reactions = Beam.reactions(json),
        fixed = Beam.support2load(json, reactions),
        loading = Beam.singularity(fixed.loads);

    shear = Beam.integrate(loading);
    moment = Beam.integrate(shear);
    var intmoment = Beam.integrate(moment);

    deflection = calc_deflection(intmoment);

    draw_singularity([deflection,shear, moment], json.length, reactions, ["Deflection","V(x)", "M(x)"]);
  }

  output.rect(0, 0, output.width, output.height)
    .attr({"fill": "white",
      "stroke": "white",
    "opacity": 0.5});

  setTimeout(doit, 1);
}


function calc_deflection(intmoment){
  function value(fn,x){
    var val=0;
    for(var term in fn){
      if(fn.hasOwnProperty(term)){
        if(x >= fn[term][1]  && fn[term][2] >= 0){
          val += fn[term][0] * Math.pow(x-fn[term][1],fn[term][2]);
        }
      }
    }
    return val;
  }

  var mode = beam.data("mode");
  iimoment = Beam.integrate(intmoment);
  var EI = beam.data("E")
    for(var i=0;i<beam.length;++i){
      if((typeof beam[i].type) == "string"){
        var parts = beam[i].type.split("_");
        if(parts[0] == "xsect"){
          if(parts[1] == beam.data("xsect")){
            EI *= beam[i].I;
          }
        }
      }
    }
  //console.log("EI:  " + EI);
  for(var j=0; j<iimoment.length; j++){
    iimoment[j][0] = iimoment[j][0]/EI;
  }

  if(mode == "cantilever"){
    var angle = value(intmoment,beam.len());
    //console.log(angle/EI);
    var c1 = -angle/EI;
    iimoment.push([c1,0,1]);
    var dis = value(iimoment,beam.len());
    c2 = -dis;
    //console.log(dis);
    iimoment.push([c2,0,0]);
  }else if(mode == "overhanging"){
    var pos1=0,pos2=0;      //locations of zero deflections
    for(var s = 0;s<beam.length;s++){
      if(beam[s].type == "support_pinned"){
        pos1 = beam[s]._o.position;
      }
      if(beam[s].type == "support_roller"){
        pos2 = beam[s]._data.position;
      }
    }
    var y1f=0,y2f=0;
    y1f = value(iimoment,pos1);
    y2f = value(iimoment,pos2);
    if(pos1 == pos2){
      console.log("error: support positions are equivalent");
      throw "stop execution";
      return iimoment;
    }
    var c1 = -(y2f-y1f)/(pos2-pos1);
    var c2 = -y1f-c1*pos1;
    //console.log("C1: " + c1 + " pos1: " + pos1 + " y1f: " + y1f +
    //"\nC2: " + c2 + " pos2: " + pos2 + " y2f: " + y2f);
    iimoment.push([c1,0,1]);
    iimoment.push([c2,0,0]);
    //console.log(pos1 + "  " + value(iimoment,pos1));
    //console.log(pos2 + "  " + value(iimoment,pos2));
  }else{
    console.log("error: unexpected beam mode");
  }
  return iimoment;
}


// these are the coordinates of the beam, expressed as percentages of the paper size
var BEAM_X = 0.08;
var BEAM_Y = 0.6;
var BEAM_W = 0.55;
var BEAM_H = 0.01; //doesn't matter


//pixel coordinates of x section editor
var xsect_left,xsect_top,xsect_w,xsect_h;



// scale of the beam, in pixels per meter
var SCALE = 0;

// add a load
function add_load(options, pos, len, mag, handlers)
{
  OOPS.action("insert " + options.type + " load",
      function (arr)
      {
        if (typeof arr == "undefined") // TODO: is redo correctly passing the things?
  {
    var o = options;
    o.mode = ""; // clear the "mini"
    o.start = o.position = pos; // use the dropped X position
    if (o.type.indexOf("distributed") == 0)
  {
    o.length = or(len, 100/SCALE); // default starting length
  }
    else
  {
    o.length = 0;
  }
  o.mag = or(mag, 1);

  console.log(o);
  }
        else
        {
          var o = arr[0], id = arr[1];
          console.log(o);
        }

        var load =  input.load(o, handlers);

        if (typeof id != "undefined")
        {
          Raphael._sets[id] = load;
          load.id = id;
        }

        beam.push( // glom onto the beam
            load
            );

        return load.id;
      },
    function (id)
    {
      var load = input.setById(id);
      load.parent().exclude(load);
      load.remove();

      return [load._o, load.id];
    });
}

function delete_load(load)
{
  OOPS.action("delete " + load.type + " load",
      function (loadid)
      {
        var dead = input.setById(loadid), b = dead.parent();
        b.exclude(dead);
        dead.remove();
        return [dead._o, dead._d, loadid];
      },
      function (arr)
      {
        var o = arr[0], d = arr[1], id = arr[2];

        var load = input.load(o, d);

        Raphael._sets[id] = load;
        load.id = id;

        beam.push(load);

        return id;
      },
    load.id);
}

// draws all the beam graphics, given a JSON
// representation of the beam and some click/drag handlers
function draw_beam(json, s_handlers, l_handlers)
{
  // misc. properties
  beam.len(json.length);
  //alert("jlen: " + json.length + "    beamlen: " + beam.len() + "    jmode: " + json.mode);
  beam.data("mode", json.mode);
  //alert(beam.data("mode"));
  // cantilever support
  beam.push(input.wall());

  beam.data("E",json.E);
  // supports and loads from JSON
  if (typeof(json.loads) != "undefined")
  {
    var nsupports = 0;
    var spos1;
    for (var s in json.supports)
    {
      if (json.supports.hasOwnProperty(s))
      {
        beam.push(input.support(json.supports[s], s_handlers));
        if(nsupports==0){spos1=json.supports[s].position; }
        nsupports++;
      }
      if(nsupports>1) break;
    }
    for (var l in json.loads)
    {
      if (json.loads.hasOwnProperty(l))
      {
        add_load(json.loads[l],
            or(json.loads[l].position, json.loads[l].start),
            json.loads[l].end - json.loads[l].start,
            json.loads[l].magnitude,
            l_handlers);
      }
    }
  }
  draw_xsect(json);
}


// make the URL up to date, from the current DOM state
function update_url()
{
  history.pushState(null, '', '?' + encodeURIComponent(JSON.stringify(beam.encode())));
}

// switch to cantilever mode
function cantilever()
{
  for (var i = 0; i < beam.length; ++i)
  {
    if (typeof beam[i].type != "undefined")
    {
      if (beam[i].type.indexOf("support") == 0)
      {
        beam[i].hide();
      }
      else if (beam[i].type == "wall")
      {
        beam[i].show();
      }
    }
  }

  draw();
}

// switch to overhanging mode
function overhanging()
{
  for (var i = 0; i < beam.length; ++i)
  {
    if (typeof beam[i].type != "undefined")
    {
      if (beam[i].type.indexOf("support") == 0)
      {
        beam[i].show();
      }
      else if (beam[i].type == "wall")
      {
        beam[i].hide();
      }
    }
  }

  draw();
}

// on startup, create the main Raphael object and the beam (with two supports)
window.onload = function () {
  output_div = document.getElementById("output");
  output = Raphael(output_div);
  input_div = document.getElementById("input");
  input = Raphael(input_div);


  EM = getEmSize(document.getElementById("input"))/2;
  BEAM_H = 4.5*EM/input.height;

  // buttons
  var buttons = input.set(), undo = input.set(), redo = input.set();
  undo.push(
      input.path("m" + ((input.width*5/10)+40) + "," + 30
        + "a 20,20 0,1,0 -20,20")
      .attr({"arrow-end": "block-wide-long",
        "fill-opacity": 0,
        "opacity": 0.25,
        "stroke-width": 2}),
      input.text(input.width*5/10 + 20, 30, "UNDO"),
      input.circle(input.width*5/10 + 20, 30, 20)
      .attr({"opacity": 0,
        "fill": "black"})
      .click(function () { OOPS.undo(); })
      );
  redo.push(
      input.path("m" + (input.width*6/10) + "," + 30
        + "a 20,20 0,1,1 20,20")
      .attr({"arrow-end": "block-wide-long",
        "fill-opacity": 0,
        "opacity": 0.25,
        "stroke-width": 2}),
      input.text(input.width*6/10 + 20, 30, "REDO"),
      input.circle(input.width*6/10 + 20, 30, 20)
      .attr({"opacity": 0,
        "fill": "black"})
      .click(function () { OOPS.redo(); })
      );
  buttons.push(undo, redo);


  OOPS.settings.onChange = function ()
  {
    // anything that affects the beam state is undoable,
    // so anytime the undo state changes is a perfect
    // time to redraw the graphs
    setTimeout("draw();", 1); // asynchronous

    // see if we have to enable/disable the undo/redo buttons
    if (OOPS.undo_queue.length > 0)
    {
      undo[0].attr("opacity", 1);
    }
    else
    {
      undo[0].attr("opacity", 0.25);
    }

    if (OOPS.redo_queue.length > 0)
    {
      redo[0].attr("opacity", 1);
    }
    else
    {
      redo[0].attr("opacity", 0.25);
    }
  }

  // set up the input workspace
  beam = input.set();
  toolbox = input.set();
  var thebeam = input.rect(input.width   *BEAM_X,
      input.height  *BEAM_Y,
      input.width   *BEAM_W,
      input.height  *BEAM_H);
  thebeam.type = "beam";

  var space_r = 1-(BEAM_X + BEAM_W);
  xsect_w = input.width*space_r*6/10;
  xsect_h = input.height*5/10;
  if(xsect_w > 1.4*xsect_h){
    xsect_w = 1.4*xsect_h;
  }
  xsect_left = input.width*(BEAM_X + BEAM_W + space_r/2) - xsect_w/2;
  xsect_top = input.height*(BEAM_Y/2);

  beam.data("E",1000000);

  input.text(xsect_left + xsect_w/2,xsect_top-12,"Select Cross Section")
    .click( function() { select_xsect() } )
    .attr("font-size", 12);
  input.text(xsect_left + xsect_w/2,xsect_top + xsect_h +9,"Set Cross Section Dimensions")
    .click( function() { select_xdims() } )
    .attr("font-size",10);
  var thexsect = input.rect(xsect_left,
      xsect_top,
      xsect_w,
      xsect_h);


  //rectangular cross section
  var rec_sect = input.set();
  rec_sect.type = "xsect_rect";
  rec_sect.w = 1;
  rec_sect.h = 1;
  draw_xrect(rec_sect);
  //rec_sect.hide();

  //circular cross section
  var circ_sect = input.set();
  circ_sect.type = "xsect_circ";
  circ_sect.r1 = 1;
  circ_sect.r2 = .5;
  draw_xcirc(circ_sect);
  circ_sect.hide();


  var t_sect = input.set();
  t_sect.b = 1;
  t_sect.t = 1;
  t_sect.w = 5;
  t_sect.h = 5;
  t_sect.type = "xsect_T";
  draw_xT(t_sect);
  t_sect.hide();


  //TODO: move these
  draw_xW = function(){};
  draw_wI = function(){};
  beam.push(t_sect,rec_sect,circ_sect);
  beam.data("xsect","rect");

  // wrapper for beam.data("length")
  beam.len = function ()
  {
    return this.data("length", arguments[0]);
  };

  // redraw the beam
  beam.redraw = function ()
  {
    // right now, the DOM is up to date
    //            the graphics might be out of date
    //            the URL might be out of date

    // bring the URL up to speed
    update_url();

    // get rid of all the graphics (and the DOM)
    for (var i = 0; i < beam.length; ++i)
    {
      if (   beam[i].type.indexOf("load") == 0
          || beam[i].type.indexOf("support") == 0
          || beam[i].type == "wall")
      {
        var dead = input.setById(beam[i].id);
        //alert("dead: " + dead + "       type: " + dead.type);
        beam.exclude(dead);
        dead.remove();
        --i;
      }
    }

    // redraw using the URL as a source
    draw_beam(JSON.parse(decodeURIComponent(location.search.substring(1))),
        [s_move, s_start, s_end], [l_move, l_start, l_end,
        left_move, l_start, left_end,
        right_move, l_start, right_end]);
    /*s_move = move(input.support, m_upd),
      s_start = start(input.support),
      s_end = end(input.support, m_upd),*/
  };

  SCALE = input.width*BEAM_W; // px/m

  /* These are generic drag handler factory functions, for doing stuff
   * in the x direction. They take a drawing function (i.e. input.load or input.support)
   * and an update function (to apply dx to the drawing function's options dict) and
   * they handle the drawing of a "ghost" object during the drag operation and the
   * element replacement afterwards.
   *
   * All of the loads and supports are created with invisible drag boxes, so the drag handlers
   * are installed on those and this.parent() is the load/support.
   *
   * Additionally, the drawing functions save their parameters (o and d) on the returned object
   * as _o and _d, so it is easy to recover the parameters for easy modification.
   */
  var move = function (creat, upd) { return function (dx, dy)
    {
      var o = deepcopy(this.parent()._o);

      oarr = upd(o, dx);
      o = oarr[0];
      dx = oarr[1];

      o.mode = "ghost";

      this.data("ghost").remove();
      this.data("ghost", creat(o));

      this.transform("t" + dx + ",0");
      this.dx = dx;
    }},
      start = function (creat) { return function ()
        {
          this.dx = 0;
          this.parent().hide();
          this.data("ghost", creat(this.parent()._o));
        }},
      end = function (creat, upd) { return function ()
        {
          function replace(leave, come)
          {
            var id = leave.id, guardian = leave.parent();

            guardian.exclude(leave);
            leave.remove();

            // even though we are ghosting,
            // make sure the load has a stable id (for undo/redo)
            come.id = id;
            Raphael._sets[id] = come; // HACK
            guardian.push(come);

            return id;
          }

          var options = deepcopy(this.parent()._o), dx = this.dx, box = this;

          this.data("ghost").remove();
          this.transform("");

          OOPS.action("move/resize " + options.type + " load by dx=" + dx,
              function (arr)
              {
                var dx = arr[0], upd = arr[1][0], creat = arr[1][1],
            load = input.setById(arr[2]),
            o = deepcopy(load._o);

          o = upd(o, dx)[0];

          return [dx, [upd, creat], replace(load, creat(o, load._d))];
              },
              function (arr)
              {
                var dx = arr[0], upd = arr[1][0], creat = arr[1][1],
            load = input.setById(arr[2]),
            o = deepcopy(load._o);

          o = upd(o, -dx)[0];

          return [dx, [upd, creat], replace(load, creat(o, load._d))];
              },
            [dx, [upd, creat], this.parent().id]);
        }
      };

  // here we make different update functions for move, left-resize and right-resize
  var m_upd = function (o, dx)
  {
    o.position += dx/SCALE*beam.len();
    if (o.position < 0)
    {
      dx -= o.position*SCALE/beam.len();
      o.position = 0;
    }
    if (o.length)
    {
      if (o.position + o.length > (input.width*BEAM_W/SCALE*beam.len()))
      {
        dx -= (o.position + o.length)*SCALE/beam.len() - (input.width*BEAM_W);
        o.position = input.width*BEAM_W/SCALE*beam.len() - o.length;
      }
    }
    else
    {
      if (o.position > (input.width*BEAM_W/SCALE*beam.len()))
      {
        dx -= o.position*SCALE/beam.len() - input.width*BEAM_W;
        o.position = input.width*BEAM_W/SCALE*beam.len();
      }
    }
    return [o, dx];
  },
    left_upd = function (o, dx)
    {
      o.position += dx/SCALE*beam.len();
      o.length -= dx/SCALE*beam.len();
      if (o.position < 0)
      {
        dx -= o.position*SCALE/beam.len();
        o.length += o.position;
        o.position = 0;
      }
      if (o.length <= 0)
      {
        dx += o.length*SCALE/beam.len();
        o.position += o.length;
        o.length = 0;
      }
      return [o, dx];
    },
    right_upd = function (o, dx)
    {
      o.length += dx/SCALE*beam.len();
      if (o.position + o.length > (input.width*BEAM_W/SCALE*beam.len()))
      {
        dx -= (o.position + o.length)*SCALE/beam.len() - (input.width*BEAM_W);
        o.length -= (o.position + o.length)
          - (input.width*BEAM_W/SCALE*beam.len());
      }
      if (o.length <= 0)
      {
        dx -= o.length*SCALE/beam.len();
        o.length = 0;
      }
      return [o, dx];
    },

    // now use the factories to make drag handlers
    l_move = move(input.load, m_upd),
    left_move = move(input.load, left_upd),
    right_move = move(input.load, right_upd),
    s_move = move(input.support, m_upd),

    l_start = start(input.load),
    left_start = start(input.load),
    right_start = start(input.load),
    s_start = start(input.support),

    l_end = end(input.load, m_upd),
    left_end = end(input.load, left_upd),
    right_end = end(input.load, right_upd),
    s_end = end(input.support, m_upd),

    /* the drag handlers for the toolbox items are still special-cased
     * since they need to move in both the x and y directions
     * and they don't stay where they are dropped (they either disappear or
     * snap on to the beam)
     */
    t_move = function (dx, dy)
    {
      this.parent().transform("t" + dx + "," + dy);
      this.dx = dx;
      this.dy = dy;
    },
    t_start = function ()
    {
      toolbox.push(input.load(this.parent()._o, this.parent()._d));
      this.ox = this.attr("x");
      this.oy = this.attr("y");
    },
    t_end = function ()
    {
      // is it close to the beam?
      if ((this.ox + this.dx) >= input.width*BEAM_X
          && (this.ox + this.dx) <= input.width*(BEAM_X + BEAM_W)
          && (this.oy + this.dy) >= input.height*(BEAM_Y - 2*BEAM_H)
          && (this.oy + this.dy) <= input.height*(BEAM_Y + BEAM_H))
      {
        // add it!
        var options = deepcopy(this.parent()._o), ox = this.ox, dx = this.dx;

        add_load(options,
            (ox + dx - input.width*BEAM_X)/SCALE*beam.len(),
            undefined, undefined,
            [l_move, l_start, l_end,
            left_move, l_start, left_end,
            right_move, l_start, right_end]);
      }

      this.parent().remove();
    };

  thebeam.attr("fill", "#BBB");
  thebeam.attr("stroke", "#666"); // a positively DEVILISH shade of gray

  //TODO: scale input locations
  toolbox.push( // put all the stuff in the toolbox
      input.text(60, 25, "Add loads:").scale(1.5, 1.5),
      input.load(
        {type: "concentrated", resizeable: false, mode: "mini",
          x: 120, y: 30, w: 0, h: 15},
          [t_move, t_start, t_end]),
      input.load(
        {type: "moment", resizeable: false, mode: "mini",
          x: 160, y: 30, w: 15, h: 15},
          [t_move, t_start, t_end]),
      input.load(
        {type: "distributed-constant", mode: "mini",
          x: 200, y: 30, w: 50, h: 15},
          [t_move, t_start, t_end]),
      input.load(
        {type: "distributed-linear", mode: "mini",
          x: 285, y: 30, w: 50, h: 15},
          [t_move, t_start, t_end])
      );

  beam.data("length", 1);
  beam.data("mode", "overhanging");
  beam.push(
      thebeam
      );

  // if the URL has a beam encoded in it, load it up
  if (location.search != "")
  {
    var json = JSON.parse(decodeURIComponent(location.search.substring(1)));
    draw_beam(json, [s_move, s_start, s_end], [l_move, l_start, l_end,
        left_move, l_start, left_end,
        right_move, l_start, right_end]);
  }
  else
  {
    beam.push( // create the default set of supports for a
        // simply supported (possibly overhanging) beam
        input.support({type: "pinned", position: 0}, [s_move, s_start, s_end]),
        input.support({type: "roller", position: 1}, [s_move, s_start, s_end]),
        input.wall()
        );
  }

  // clicklabel for resizing the beam / changing the mode
  //alert("ere" + beam.data("mode"));
  beam.push(
      input.text(input.width*(BEAM_X*0.85),
        input.height*(BEAM_Y + BEAM_H/2),
        beam.data("mode"))
      .attr("text-anchor", "end")
      .click(function ()
        {
          var t = this;
          function switch_mode()
      {
        switch (beam.data("mode"))
      {
        case "overhanging":
          beam.data("mode", "cantilever");
          cantilever();
          break;
        case "cantilever":
          beam.data("mode", "overhanging");
          overhanging();
          break;
        default:
          break;
      }
      t.attr("text", beam.data("mode"));
      }

      OOPS.action("switch beam mode",
          switch_mode,
          switch_mode);
        }),
    input.text(xsect_left + xsect_w/2,xsect_top + xsect_h + 20,
        "E = " + beam.data("E").toPrecision(4))
      .click( function() {setE(this) } )
      .attr("font-size",10),
    input.text(input.width*(BEAM_X + BEAM_W*1.05),
        input.height*(BEAM_Y + BEAM_H/2),
        beam.len() + " m")
      .attr("text-anchor", "start")
      .click(function ()
          {
            var str = prompt("New value for beam length (m):"
              + "\n\nsyntax: ST#"
              + "\n\tS is where to anchor the resize (L left, R right, M middle)"
              + "\n\tT is whether to keep absolute load/support positions (+)"
              + "or scale them with beam length (=)"
              + "\n\t# is the new beam length\n\n", "L+" + beam.len());
            if (str !== null && str.length >= 3)
      {
        var S = str[0], T = str[1], val = parseFloat(str.slice(2));
        if ("LRM".indexOf(S) != -1 && "=+".indexOf(T) != -1 && !isNaN(val))
      {
        var t = this;
        OOPS.action("change beam length from " + beam.len() + " to " + val + " m",
          function (arr)
          {
            var S = arr[0], T = arr[1], len = arr[2];
            var old_len = beam.len();
            beam.len(len);
            if (T == "=")
        {
          for (var i = 0; i < beam.length; ++i)
        {
          if (beam[i].type.indexOf("load") == 0
            || beam[i].type.indexOf("support") == 0)
          {
            if (typeof beam[i]._data.position != "undefined")
          beam[i]._data.position *= len / old_len;
        if (typeof beam[i]._data.start    != "undefined")
          beam[i]._data.start    *= len / old_len;
        if (typeof beam[i]._data.end      != "undefined")
          beam[i]._data.end      *= len / old_len;
        if (typeof beam[i]._data.length   != "undefined")
          beam[i]._data.length   *= len / old_len;
          }
        }
        }
            else // T = "+"
            {
              for (var i = 0; i < beam.length; ++i)
              {
                if (beam[i].type.indexOf("load") == 0
                    || beam[i].type.indexOf("support") == 0)
                {
                  function check_outlier(i)
                  {
                    if (   (typeof beam[i]._data.position != "undefined"
                          && (beam[i]._data.position < 0
                            || beam[i]._data.position > len))
                        || (typeof beam[i]._data.start    != "undefined"
                          && (beam[i]._data.start < 0
                            || beam[i]._data.start > len))
                        || (typeof beam[i]._data.end      != "undefined"
                          && (beam[i]._data.end < 0
                            || beam[i]._data.end > len)))
                    {
                      if (beam[i].type.indexOf("support") == 0)
                      {
                        beam[i]._data.position = len;
                      }
                      else
                      {
                        // not undoable?
                        var dead = beam[i];
                        console.log("Dead: " + dead);
                        beam.exclude(beam[i]);
                        dead.remove();
                        return i - 1; // HACK
                      }
                    }
                    return i;
                  }

                  if (S == "R")
                  {
                    // move loads
                    if (typeof beam[i]._data.position != "undefined")
                      beam[i]._data.position = len
                        - (old_len - beam[i]._data.position);

                    if (typeof beam[i]._data.start    != "undefined")
                      beam[i]._data.start    = len
                        - (old_len - beam[i]._data.start);

                    if (typeof beam[i]._data.end      != "undefined")
                      beam[i]._data.end      = len
                        - (old_len - beam[i]._data.end);
                  }
                  else if (S == "M")
                  {
                    // move loads
                    if (typeof beam[i]._data.position != "undefined")
                      beam[i]._data.position = len/2
                        + (beam[i]._data.position - old_len/2);

                    if (typeof beam[i]._data.start    != "undefined")
                      beam[i]._data.start    = len/2
                        + (beam[i]._data.start - old_len/2);

                    if (typeof beam[i]._data.end      != "undefined")
                      beam[i]._data.end      = len/2
                        + (beam[i]._data.end - old_len/2);
                  }
                  i = check_outlier(i);
                }
              }
            }
            t.attr("text", len + " m");
            beam.redraw();
            return [S, T, old_len];
          },
          function (arr)
          {
            var S = arr[0], T = arr[1], len = arr[2];
            var old_len = beam.len();
            beam.len(len);
            t.attr("text", len + " m");
            beam.redraw();
            return [S, T, old_len];
          },
          [S, T, val]);
      }
      }
          })
  );
}

