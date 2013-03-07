/* Diagramr beam encoding/processing functions
 *  (this is where the mechanical engineering happens)
 *
 * Alex Burka, October 2011
 * modified Jordan Singleton Fall 2012
 */

// like map, but the function returns an array instead of
// a single transformed element. all of the returned arrays
// are concatenated.
Array.prototype.mapcat = function (fn)
{
  return [].concat.apply([], this.map(fn));
}

Beam = {

  // verify that a JSON object is a correctly encoded beam
  //  return true or undefined
  // (currently unused)
  verify: function (beam)
  {
    return beam.length
      && beam.supports
      && beam.loads

      && beam.supports.length == 2
      && beam.supports.filter(function (s) { return s.type == "pinned"; }).length == 1
      && beam.supports.filter(function (s) { return s.type == "roller"; }).length == 1;
  },

  // get the magnitude of any load type
  magnitude: function (load)
  {
    switch (load.type)
    {
      case "concentrated":
      case "moment":
        return load.magnitude;
      case "distributed-constant":
        return load.magnitude * (load.end - load.start);
      case "distributed-linear":
        return 0.5 * Math.pow(load.end - load.start, 2) * load.magnitude;
      default:
        throw "unsupported load type!";
    }
  },

  // get the centroid of any load type
  centroid: function (load)
  {
    switch (load.type)
    {
      case "concentrated":
      case "moment":
        return load.position;
      case "distributed-constant":
        return (load.start + load.end) / 2;
      case "distributed-linear":
        return load.start + (load.end - load.start)*2/3;
      default:
        throw "unsupported load type!";
    }
  },

  // turn a finite distributed load into a series of infinite distributed loads
  counterbalancers: function (load)
  {
    switch (load.type.substr(12))
    {
      case "constant":
        return [{type: "distributed-constant",
          position: load.start,
          magnitude: load.magnitude},
               {type: "distributed-constant",
                 position: load.end,
                 magnitude: -load.magnitude}];
      case "linear":
        if (load.magnitude > 0)
        {
          return [{type: "distributed-linear",
            position: load.start,
            magnitude: load.magnitude},
                 {type: "distributed-linear",
                   position: load.end,
                   magnitude: -load.magnitude},
                 {type: "distributed-constant",
                   position: load.end,
                   magnitude: load.magnitude * (load.start - load.end)}];
        }
        else
        {
          return [{type: "distributed-constant",
            position: load.start,
            magnitude: load.magnitude * (load.start - load.end)},
                 {type: "distributed-linear",
                   position: load.start,
                   magnitude: load.magnitude},
                 {type: "distributed-linear",
                   position: load.end,
                   magnitude: -load.magnitude}];
        }
      default:
        throw "unsupported load type!";
    }
  },

  // make a term of the singularity function for the load
  // m*<x - a>^n => [m, a, n]
  singularity_function: function (load)
  {
    switch (load.type)
    {
      case "concentrated":
        return [load.magnitude, load.position, -1];
      case "moment":
        return [load.magnitude, load.position, -2];
      case "distributed-constant":
        return [load.magnitude, load.position, 0];
      case "distributed-linear":
        return [load.magnitude, load.position, 1];
      default:
        throw "unsupported load type!";
    }
  },

  // is thing A entirely to the left of thing B?
  left: function (A, B)
  {
    return or(A.position, A.end) <= or(B.position, B.start);
  },

  // calculate the reactions for an overhanging beam
  reactions: function (beam)
  {
    if (beam.mode == "cantilever") return;

    function sum (arr) { return arr.reduce(function (a,b) { return a+b; }, 0); }

    // make sure the supports are in order
    beam.supports.sort(function (a, b)
        {
          if (a.position == b.position)
      return 0;

    if (a.position < b.position)
      return -1;

    return 1;
        });

    // convert moments to couples, split distributed loads at supports
    var tr_loads = beam.loads.mapcat(
        function (load)
        {
          // moment -> couple
          if (load.type == "moment")
    {
      return [{type: "concentrated",
        position: load.position - 0.05,
        magnitude: load.magnitude*10},
        {type: "concentrated",
          position: load.position + 0.05,
        magnitude: -load.magnitude*10}];
    }
          else if (load.type.indexOf("distributed-") == 0)
    {
      // let's see if we have to split this load around any supports

      var loads = [];
      var load_start = load.start, lastmag = 0;
      // load_start is the continually-updated position
      //   of the start of the load that is being split
      // lastmag is the instantaneous magnitude of the load
      //   at the last place where it was split
      //   (used for adding constant loads to fix up
      //    split linear loads)

      if ( load.type.indexOf("linear") != -1
          && load.magnitude < 0)
      {
        // negatively sloped loads need to start with a lastmag
        lastmag = load.magnitude * (load.start - load.end);
      }

      for (var s in beam.supports)
      {
        if (beam.supports.hasOwnProperty(s))
        {
          if (load_start < beam.supports[s].position
              && load.end > beam.supports[s].position)
          {
            // load from the last split position to here
            loads.push({type:      load.type,
              magnitude: load.magnitude,
            start:     load_start,
            end:       beam.supports[s].position});
            if (lastmag > 0)
            {
              // we might need a constant load
              loads.push({type:      "distributed-constant",
                magnitude: lastmag,
                start:     load_start,
                end:       beam.supports[s].position});
            }

            if (load.type.indexOf("linear") != -1)
            {
              // update last mag for linear loads
              lastmag += load.magnitude
                * (beam.supports[s].position - load_start);
            }
            // update starting position, since the load was just split
            load_start = beam.supports[s].position;
          }
        }
      }

      // in case the load extends past the last support,
      // there might be one dangling portion to add on
      if (load_start < load.end)
      {
        loads.push({type: load.type,
          magnitude: load.magnitude,
        start: load_start,
        end: load.end});
        if (lastmag > 0)
        {
          loads.push({type:      "distributed-constant",
            magnitude: lastmag,
            start:     load_start,
            end:       load.end});
        }
      }

      console.log(JSON.stringify(load));
      console.log(JSON.stringify(loads));
      return loads;
    }
          else
          {
            return [load];
          }
        });

    // calculate reactions
    var A = beam.supports[0],
        B = beam.supports[1],

        loads = sum(
            tr_loads
            .map(function (l) { return Beam.magnitude(l); })),
        loads_left = sum(
            tr_loads
            .filter(function (l) { return Beam.left(l, A); })
            .map(function (l) { return Beam.magnitude(l) * (A.position - Beam.centroid(l)); })),
        loads_right = sum(
            tr_loads
            .filter(function (l) { return Beam.left(A, l); })
            .map(function (l) { return Beam.magnitude(l) * (Beam.centroid(l) - A.position); })),

        Rb = (loads_right - loads_left) / (B.position - A.position),
        Ra = (loads - Rb);

    return [Ra, Rb];
  },

  // given a beam with loads and supports, turn the supports into negative loads
  support2load: function (beam, reactions)
  {
    if (beam.mode == "overhanging")
    {
      // turn the supports into loads
      for (var i in reactions)
      {
        if (reactions.hasOwnProperty(i))
        {
          beam.loads.push({type: "concentrated",
            position: beam.supports[i].position,
          magnitude: -reactions[i]});
        }
      }
    }

    delete beam.supports;

    return beam;
  },

  // given a list of loads, construct the singularity function
  singularity: function (loads)
  {
    var inf_loads = loads.mapcat(function (l)
        {
          if (l.type.indexOf("distributed-") == 0)
    {
      return Beam.counterbalancers(l);
    }
          else
    {
      return [l];
    }
        }),
    sorted_loads = inf_loads.sort(function (a, b)
        {
          return a.position > b.position;
        });

    return sorted_loads.map(Beam.singularity_function);
  },

  // integrate a series of singularity-function terms
  integrate: function (terms)
  {
    return terms.map(function (sing)
        {
          var m = sing[0], a = sing[1], n = sing[2];

          if (n < 0)
    {
      return [m, a, n+1];
    }
          else
    {
      return [m / (n+1), a, n+1];
    }
        });
  }
};

// encode the current beam into JSON format
//  this is a recursive function
//    so it may be called on the beam, or on a support/load
Raphael.st.encode = Raphael.el.encode = function () {
  var parts = this.type.split("_");
  var data = {};
  switch (parts[0]) // what am I?
  {
    case "set": // I am a beam. setup the whole JSON structure
      data.length = beam.len(); // beam length in meters
      data.mode = beam.data("mode");
      data.xsect_type = beam.data("xsect");
      data.supports = [];
      data.loads = [];
      data.E = beam.data("E");
      for (var i = 0; i < this.length; ++i) // loop through everything and recurse
      {
        if (this[i].type.indexOf("support") == 0)
        {
          data.supports.push(this[i].encode());
        }
        else if (this[i].type.indexOf("load") == 0)
        {
          data.loads.push(this[i].encode());
        }
        else if (this[i].type.indexOf("xsect") == 0 && this[i].type.indexOf(data.xsect_type) == 6)
        {
          //alert(this[i].type);
          data.xsect = this[i].encode();
        }
      }
      break;
    case "support": // I am a support. return a JSON fragment
      data.type = parts[1];
      data.position = this.data("position");
      break;
    case "load": // I am a load. return a JSON fragment
      data.type = parts[1];
      data.magnitude = this.data("mag");
      switch (parts[1])
      {
        case "concentrated":
        case "moment":
          data.position = this.data("position");
          break;
        case "distributed-constant":
        case "distributed-linear":
          data.start = this.data("start");
          data.end = this.data("end");
          break;
        default:
          console.log("unsupported load type!");
      }
      break;
    case "xsect":
      data.type = parts[1];
      switch(parts[1]){
        case "rect":
          data.w = this.w;
          data.h = this.h;
          break;
        case "circ":
          data.r1 = this.r1;
          data.r2 = this.r2;
          break;
        case "T":
          data.w = this.w;
          data.h = this.h;
          data.t = this.t;
          data.b = this.b;
          break;
        default:
          console.log("unsupported cross-section type!");
      }

      break;
    default:
      console.log("what am I?");
  }
  return data;
};
