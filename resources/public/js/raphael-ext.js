/* Raphael extensions and utility functions
 *
 * Alex Burka, October 2011
 */

/* Duplicate an object by transferring each property.
 * TODO: should it recursively call deepcopy?
 */
function deepcopy(from)
{
  var to = {};

  for (var k in from)
  {
    if (from.hasOwnProperty(k))
    {
      to[k] = from[k];
    }
  }

  return to;
}

/*
 * Select b if a is undefined.
 *
 * Just like a || b except it doesn't fail when a is 0/false.
 */
function or(a, b)
{
  return typeof a == "undefined" ? b : a;
}

/* Sets in Raphael are implemented in kind of a strange way. There seems to be no support
 * in the actual SVG for the sets, they are just pseudo-arrays of the JS objects. Then any
 * functions called on them are just mapped to each of the children with forEach. This is usually
 * fine, but it means you can't store any data on the set itself. Also, it is hard or impossible
 * to find out which set an element/set belongs to.
 *
 * My extensions to Raphael.fn/st/el allow per-set data (by putting a _data element on
 * each set object) and also tracing through the set hierarchy, through el.parent()/st.parent().
 * This would break if something were to be added to two different sets.
 */
Raphael._sets = {}; // we need a record of all the sets created, indexed by ID
Raphael.fn._set = Raphael.fn.set;
Raphael.fn.set = function () { // store each new set in Raphael._sets, and give it a _data
  var s = this._set();
  s._data = {};
  
  var id = 0;
  for (var key in Raphael._sets) // get a unique ID
  {
    if (Raphael._sets.hasOwnProperty(key) && (key - 0) >= id)
    {
      id = (key - 0) + 1;
    }
  }

  Raphael._sets[id] = s;
  s.id = id;

  return s;
}
Raphael.fn.setById = function (id) { // grab a set out of Raphael._sets
  return Raphael._sets[id];
}
Raphael.st._push = Raphael.st.push; // mask Set.push, to set up the parent hierarchy
Raphael.st.push = function (/* ... */) {
  for (var i = 0; i < arguments.length; ++i)
  {
    if (arguments[i])
    {
      arguments[i]._parent = this.id;
      this._push(arguments[i]);
    }
  }
};
Raphael.st.parent = Raphael.el.parent = function ()
{
  return input.setById(this._parent);
}
Raphael.st.data = function (/* ... */) // Set.data, just like Element.attr
{
  switch (typeof arguments[0])
  {
    case "undefined": // no arguments: return all the data
      return this._data;

    case "string": // one property name
      switch (typeof arguments[1])
      {
        case "undefined": // one property name given: return the value
          return this._data[arguments[0]];
        default:
          this._data[arguments[0]] = arguments[1]; // name and value given: set it
          return this;
      }
      break;

    case "object": // dict given: set all the values
      for (var k in arguments[0])
      {
        if (arguments[0].hasOwnProperty(k))
        {
          this.data(k, arguments[0][k]);
        }
      }
      return this;
  }
}

// draw an arrow
//  parameters:
//    - x1/y1: coordinates of origin point
//    - x2/y2: coordinates of destination point (where the arrowhead is drawn)
//  returns: the arrow element
//  (all the examples online use atan2 to draw a rotated triangle
//   but there is an easy Raphael attribute to add an arrowhead)
//  note: the returned element is a path, but its type is set to "arrow"
//    this has been observed to cause problems occasionally
//      (like when using Raphael to modify the path string later)
//      if it does, just change the type back to "path"
Raphael.fn.arrow = function (x1, y1, x2, y2) {
  var arrow = this.path("m" + x1 + "," + y1
            + "l" + (x2-x1) + "," + (y2-y1));

  arrow.attr("arrow-end", "block-wide-long");
  this.type = "arrow";
  return arrow;
}

