/* Oops: JavaScript undo/redo library
 *
 * Alex Burka
 * November 2011
 */

OOPS = {
  // START public interface
  settings: { // external settings
              max_undo: 20, // CURRENTLY IGNORED
              onChange: function () {}
            },

  action: function (name, forward, backward, starting_param)
  {
    this.redo_queue = [];
    this.register_undo(name, forward, backward, forward(starting_param));
    this.settings.onChange();
  },

  actionFn: function (name, fn, for_args, back_args)
  {
    return this.action(name,
        function () { return fn.apply(for_args); },
        function () { return fn.apply(back_args); });
  },

  group: function ()
  {
    // TODO: groups within groups
    if (this.group)
    {
      this.undo_queue[this.undo_queue.length-1].name += " }";
      this.group = false;
    }
    else
    {
      this.group = true;
      this.undo_queue[this.undo_queue.length-1].name += "{ ";
    }
  },

  undo: function ()
  {
    console.log("OOPS.undo");
    if (this.group)
    {
      throw "no undoing while in a group!";
    }
    else if (this.undo_queue.length > 0)
    {
      var item = this.undo_queue.pop();

      for (var fn in item.backward)
      {
        if (item.backward.hasOwnProperty(fn))
        {
          item.thing[fn] = item.backward[fn](item.thing[fn]);
        }
      }
      console.log(item.thing);
      this.redo_queue.push(item);
      this.settings.onChange();
    }
  },

  redo: function ()
  {
    console.log("OOPS.redo");
    if (this.group)
    {
      throw "no redoing while in a group!";
    }
    else if (this.redo_queue.length > 0)
    {
      var item = this.redo_queue.pop();

      for (var fn in item.forward)
      {
        if (item.forward.hasOwnProperty(fn))
        {
          item.thing[fn] = item.forward[fn](item.thing[fn]);
        }
      }
      console.log(item.thing);
      this.undo_queue.push(item);
      this.settings.onChange();
    }
  },
  // internal functions
  register_undo: function (n, f, b, t)
  {
    if (this.group)
    {
      this.undo_queue[this.undo_queue.length-1].name += ", " + n;
      this.undo_queue[this.undo_queue.length-1].forward.push(f);
      this.undo_queue[this.undo_queue.length-1].thing.push(t);
      this.undo_queue[this.undo.length-1].backward = [b].concat(
          this.undo_queue[this.undo_queue.length-1].backward);
    }
    else
    {
      this.undo_queue.push({name: n, forward: [f], backward: [b], thing: [t]});
    }
  },

  // internal state
  undo_queue: [],
  redo_queue: [],
  group: false,

};

