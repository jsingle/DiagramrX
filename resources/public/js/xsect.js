/*xsect.js
 *
 * Cross section functions for Diagramr-EX
 * Jordan Singleton, 2012
 *
 *
 */


//calculate shear stress
function calc_shearst(sheer){
  var xsect = beam.data("xsect");
  var xsec, stress;
  for(var i=0;i<beam.length;i++){
    var parts = beam[i].type.split("_");
    if(parts[0] == "xsect"){
      if(parts[1] == xsect){
        xsec = beam[i];
        break;
      }
    }
  }
  var stress;
  switch(xsect){
    case "rect":
      stress = shear*(xsec.h/2*xsec.w*xsec.h/4)/(xsec.I*xsec.w);
      break;i
    case "circ":
        var Q = 2*xsec.r1*xsec.r1*xsec.r1/3 - 2*xsec.r2*xsec.r2*xsec.r2/3;
        stress = shear*Q/(xsec.I*2*(xsec.r1-xsec.r2));
        break;
    case "T":
        var where = "web";
        if(xsec.NA > (xsec.h-xsec.t)){
          //check both
          var test =shear*xsec.Qna/(xsec.I*xsec.w);
          stress = shear*(xsec.b*(xsec.h-xsec.t)*(xsec.h-xsec.t)/2)/(xsec.I*xsec.b);
          if(Math.abs(test) > Math.abs(stress)){
            where = "flange";
            stress = test;
          }
        }else{
          stress = shear*xsec.Qna/(xsec.I*xsec.b);
        }
        return [stress,where];

        break;
    default:
        console.log("Error: unexpected x-sect type while calculating shear stress");
        return 0;
        break;
  }
  return stress;
}


//calculate normal stress
function calc_normst(mom){
  var xsect = beam.data("xsect");
  var xsec, stress;
  for(var i=0;i<beam.length;i++){
    var parts = beam[i].type.split("_");
    if(parts[0] == "xsect"){
      if(parts[1] == xsect){
        xsec = beam[i];
        break;
      }
    }
  }
  var stress;
  switch(xsect){
    case "rect":
      stress = (xsec.h/2)*mom/(xsec.I);
      break;
    case "circ":
      stress = (xsec.r1)*mom/xsec.I;
      break;
    case "T":
      if(xsec.NA > xsec.h/2){
        stress = (xsec.NA)*mom/xsec.I;
      }else{
        stress = (xsec.h-xsec.NA)*mom/xsec.I;
      }
      break;
    default:
      console.log("Error: unexpected x-sect type while calculating shear stress");
      return 0;
      break;
  }
  return stress;
}


//Set value for E
function setE(t){
  var E = beam.data("E");
  var read= prompt("Enter a new value for E (the modulus of elasticity):",E);
  if(read == null){
    return;
  }
  var newE = parseInt(read);
  if(newE <= 0){
    alert("E must have a value greater than 0");
    return;
  }
  OOPS.action("change E from " + E + " to " + newE,
      toggle_E,
      toggle_E,
      [newE,E,t]
      );
  return;
}


//Oops registered E changer
function toggle_E(arr){
  var newE = arr[0];
  var oldE = arr[1];
  var t = arr[2];
  beam.data("E",newE);
  t.attr("text","E = " + newE);
  return [oldE,newE,t];
}


//choose x section shape
function select_xsect(t){
  var prev_shape = beam.data("xsect");
  var new_shape;
  var shape = prompt("Select Cross Section Shape:\nrect\ncirc\nT");
  switch(shape){
    case null:
      return;
      break;
    case "rect":
      new_shape = "rect";
      break;
    case "circ":
      new_shape = "circ";		
      break;
    case "T":
      new_shape = "T";		
      break;
    default:
      alert("Invalid selection:\n" + shape);
      return;
  }
  OOPS.action("change shape from " + prev_shape + " to " + new_shape,
      toggle_xshape,
      toggle_xshape,
      [new_shape,prev_shape]			
      );
}


//Oops registered change shape
function toggle_xshape(s){
  var new_shape = s[0];
  var prev_shape = s[1];
  for (var i = 0; i < beam.length; ++i)
  {
    if (typeof beam[i].type != "undefined")
    {
      var parts = beam[i].type.split("_");
      if(parts[0] == "xsect"){
        if((parts[1] != new_shape)){
          beam[i].hide();
        } else {
          beam[i].show();
        }
      }
    }
  }
  beam.data("xsect",new_shape);
  return [prev_shape,new_shape];
}



//input x section dimensions
function select_xdims(){
  var synt_str = "Set Cross-Section Dimensions:\n\n"+
    "syntax: ", old_dimstr, ix;
  for (var i = 0; i < beam.length; ++i)
  {
    if (typeof beam[i].type != "undefined")
    {
      var parts = beam[i].type.split("_");
      if(parts[0] == "xsect"){
        if((parts[1] == beam.data("xsect"))){
          ix = i;
          break;
        }
      }
    }
  }

  var dimstr, old_dimstr;
  switch(beam.data("xsect")){
    case "rect":
      synt_str += "w h\n";
      synt_str += "w is the width of the cross section as shown in the diagram\n";
      synt_str += "h is the height of the cross section as shown in the diagram\n";
      synt_str += "The two numbers should be separated by a space";
      old_dimstr = beam[ix].w.toString() + " " + beam[ix].h.toString();
      dimstr = prompt(synt_str, old_dimstr);
      if(dimstr == null) 
        return;
      var parts = dimstr.split(" ");
      var w = parseFloat(parts[0]);
      var h = parseFloat(parts[1]);
      if(w<=0 || h<=0 || w==null || h==null){
        alert("unparseable entry, please review syntax");
        return;
      }
      break;
    case "circ":
      synt_str += "r1 r2\n";
      synt_str += "r1 is the outer radius of the pipe\n";
      synt_str += "r2 is the inner radius of the pipe\n";
      synt_str += "For a solid circular cross section, set r2 to 0\n";
      synt_str += "The two numbers should be separated by a space, and r1 must be greater than r2";
      old_dimstr = beam[ix].r1.toString() + " " + beam[ix].r2.toString();
      dimstr = prompt(synt_str,old_dimstr);
      if(dimstr == null)
        return;
      var parts = dimstr.split(" ");
      var r1 = parseFloat(parts[0]);
      var r2 = parseFloat(parts[1]);
      if(r1<=0 || r2<0 || r1<=r2 || r1==null || r2==null){
        alert("invalid dimension entry, please review syntax");
        return;
      }
      break;
    case "T":
      synt_str += "w h t b\n";
      synt_str += "Values correspond to the dimensions shown in the diagram\n";
      synt_str += "w must be greater than b, and h must be greater than t\n";
      synt_str += "Enter values in order, separated by a space:";
      old_dimstr = beam[ix].w + " " + beam[ix].h + " " + beam[ix].t + " " + beam[ix].b;
      dimstr = prompt(synt_str,old_dimstr);
      if(dimstr == null)
        return;
      var parts = dimstr.split(" ");
      var w = parseFloat(parts[0]);
      var h = parseFloat(parts[1]);
      var t = parseFloat(parts[2]);
      var b = parseFloat(parts[3]);
      if(w<=0 || h<=0 || t<=0 || b<=0 || w==null || h==null || t==null || b==null){
        alert("invalid dimension entry, please review syntax");
        return;
      }
      if(t>h || b>w){
        alert("invalid dimension entry, please review syntax");
        return;
      }
      break;
    default:
      console.log("unspecified beam.data(xsect)");
      return;
      break;
  }
  OOPS.action("change dims of " + beam.data("xsect") + " from: '" + old_dimstr + "' to: '" + dimstr + "'",
      set_xdims,
      set_xdims,
      [beam.data("xsect"),dimstr,old_dimstr,ix]);
}


//Oops registered dimension changer
function set_xdims(a){
  var shape = a[0],ndimstr=a[1],odimstr=a[2],ix=a[3];
  var parts = ndimstr.split(" ");
  switch(shape){
    case "rect":
      var w = parseFloat(parts[0]);
      var h = parseFloat(parts[1]);
      beam[ix].w = w;
      beam[ix].h = h;
      break;
    case "circ":
      var r1 = parseFloat(parts[0]);
      var r2 = parseFloat(parts[1]);
      beam[ix].r1 = r1;
      beam[ix].r2 = r2;
      break;
    case "T":
      beam[ix].w = parseFloat(parts[0]);
      beam[ix].h = parseFloat(parts[1]);
      beam[ix].t = parseFloat(parts[2]);
      beam[ix].b = parseFloat(parts[3]);
      break;
    case "W":
      break;
    case "I":
      break;
    default:
      console.log("unspecified beam.data(xsect)");
      return;
  }
  update_url();
  draw_xsect(JSON.parse(decodeURIComponent(location.search.substring(1))));
  return [shape,odimstr,ndimstr,ix];
};


//draws x section editor given json
function draw_xsect(json)
{
  beam.data("xsect",json.xsect_type);
  var ix;
  for (var i = 0; i < beam.length; ++i)
  {
    if ((typeof beam[i].type) == "string")
    {
      var parts = beam[i].type.split("_");
      if(parts[0] == "xsect"){
        beam[i].hide();
        if(parts[1] == beam.data("xsect")){
          ix = i;
        }
      }
    }
  }
  switch(beam.data("xsect")){
    case "rect":
      beam[ix].w = json.xsect.w;
      beam[ix].h = json.xsect.h;
      draw_xrect(beam[ix]);
      break;
    case "circ":
      beam[ix].r1 = json.xsect.r1;
      beam[ix].r2 = json.xsect.r2;
      draw_xcirc(beam[ix]);
      break;
    case "T":
      beam[ix].w = json.xsect.w;
      beam[ix].h = json.xsect.h;
      beam[ix].t = json.xsect.t;
      beam[ix].b = json.xsect.b;
      draw_xT(beam[ix]);
      break;
    default:
      console.log("unspecified xsect type in json");
      return;
  }
  beam[ix].show();

}


//draws T section
draw_xT = function(t_sect){
  var NA;
  var Qna;
  if(t_sect.w*t_sect.t*(t_sect.t)/2 > 
      t_sect.b*(t_sect.h-t_sect.t)*(t_sect.h-t_sect.t)/2){
    for(var i=0;i<t_sect.t;i+=t_sect.t/10000){
      if((t_sect.t-i)*t_sect.w*(t_sect.t-i)/2 <=
          i*t_sect.w*i/2 + t_sect.b*(t_sect.h-t_sect.t)*((t_sect.h-t_sect.t)/2 + i)){
        Qna =(t_sect.t-i)*t_sect.w*(t_sect.t-i)/2; 
        NA = t_sect.h-t_sect.t+i;
        break;
      }
    }
  }else{
    for(var i=0;i<(t_sect.h-t_sect.t);i+=t_sect.h/10000){
      if((t_sect.h-t_sect.t-i)*t_sect.b*(t_sect.h-t_sect.t-i)/2 <=
          i*t_sect.b*i/2 + (i+t_sect.t/2)*t_sect.t*t_sect.w){
        Qna = (t_sect.h-t_sect.t-i)*t_sect.b*(t_sect.h-t_sect.t-i)/2;
        NA = t_sect.h-t_sect.t-i;
        break;
      }
    }
  }

  t_sect.Qna = Qna;
  t_sect.NA = NA;
  t_sect.I = calc_I(t_sect,"T");
  var t_scale,t_left,t_top;
  if((t_sect.w/xsect_w) > (t_sect.h/(xsect_h-9))){
    t_scale = (2*xsect_w/3)/t_sect.w;
    t_left = xsect_left +xsect_w/6;
    t_top = xsect_top + (xsect_h-(t_scale * t_sect.h))/2;
  }
  else{
    t_scale = (2*xsect_h/3)/t_sect.h;
    t_left = xsect_left + (xsect_w - (t_scale*t_sect.w))/2;
    t_top = xsect_top+ 6 + (xsect_h-9)/6;
  }

  t_sect.clear();
  t_sect.push(
      input.text(xsect_left + 24,xsect_top +6, "T-Section")
      .click(function(){select_xsect()} ),
      input.path("m" + t_left + "," + t_top 
        + "l" + t_scale*t_sect.w + "," + 0
        + "l" + 0 + "," + t_scale*t_sect.t 
        + "l" + -(t_scale*(t_sect.w - t_sect.b)/2) + "," + 0
        + "l" + 0 + "," + t_scale*(t_sect.h - t_sect.t) 
        + "l" + -(t_scale*t_sect.b) + "," + 0
        + "l" + 0 + "," + -(t_scale*(t_sect.h - t_sect.t))
        + "l" + -(t_scale*(t_sect.w - t_sect.b)/2) + "," + 0
        + "z"
        ).attr("fill","#BBB","stroke","#666"),
      input.text(t_left + t_scale*(t_sect.w/2+t_sect.b/2),
        t_top - 10,
        "w"),
      input.arrow(xsect_left + xsect_w/2,
        t_top - 4,
        t_left + 2,
        t_top  - 4),
      input.arrow(xsect_left + xsect_w/2,
        t_top - 4,
        t_left + t_scale*t_sect.w - 2,
        t_top  - 4),
      input.text(t_left + t_scale*t_sect.w + 10,
          t_top + t_scale*(t_sect.t/2),
          "t"),
      input.arrow(t_left + t_scale*t_sect.w + 4,
          t_top + t_scale*t_sect.t/2,
          t_left + t_scale*t_sect.w + 4,
          t_top + 2),
      input.arrow(t_left + t_scale*t_sect.w + 4,
          t_top + t_scale*t_sect.t/2,
          t_left + t_scale*t_sect.w + 4,
          t_top + t_scale*t_sect.t - 2),
      input.text(t_left + t_scale*(t_sect.w + t_sect.b)/2 + 6,
          t_top + t_scale*t_sect.h + 4,
          "b"),
      input.arrow(t_left -4,
          t_top + t_scale*t_sect.h/2,
          t_left - 4,
          t_top + 2),
      input.arrow(t_left -4,
          t_top + t_scale*t_sect.h/2,
          t_left - 4,
          t_top + t_scale*t_sect.h - 2),
      input.text(t_left + 2,
          t_top + t_sect.h*t_scale/2,
          "h"),
      input.arrow(t_left + t_sect.w*t_scale/2,
          t_top + t_scale*t_sect.h +4,
          t_left + (t_scale*(t_sect.w-t_sect.b)/2) + 2,
          t_top + t_scale*t_sect.h +4),
      input.arrow(t_left + t_sect.w*t_scale/2,
          t_top + t_scale*t_sect.h +4,
          t_left + (t_scale*(t_sect.w+t_sect.b)/2) - 2,
          t_top + t_scale*t_sect.h +4),
      input.text(xsect_left + xsect_w + 2,
          xsect_top + 5,
          "w = " + round(t_sect.w,4)).attr("text-anchor" , "start")
        .click(function(){select_xdims()}),
      input.text(xsect_left + xsect_w + 2,
          xsect_top + 15,
          "h = " + round(t_sect.h,4)).attr("text-anchor" , "start")
        .click(function(){select_xdims()}),
      input.text(xsect_left + xsect_w + 2,
          xsect_top + 25,
          "t = " + round(t_sect.t,4)).attr("text-anchor" , "start")
        .click(function(){select_xdims()}),
      input.text(xsect_left + xsect_w + 2,
          xsect_top + 35,
          "b = " + round(t_sect.b,4)).attr("text-anchor" , "start")
        .click(function(){select_xdims()}),
      input.text(xsect_left + xsect_w + 2,
          xsect_top + 48,
          "I = " + t_sect.I.toPrecision(4)).attr("text-anchor","start")
        .click(function(){select_xdims()}),
      input.path("m" + xsect_left + "," + (t_top + t_scale*(t_sect.h-NA)) +
          "l" + xsect_w + "," + 0)
        .attr("stroke-dasharray","- "),
      input.text(xsect_left + xsect_w +2,xsect_top +60,
          "NA at " + round(NA,4))
        .attr("text-anchor", "start")
        );
};



//draw annulus section
draw_xcirc  = function (circ_sect){
  circ_sect.I = calc_I(circ_sect,"circ");
  circ_sect.clear();
  circ_sect.n = circ_sect.r2/circ_sect.r1;
  circ_sect.r1pix = xsect_h*3/8;
  circ_sect.r2pix = circ_sect.r1pix*circ_sect.n;
  if(circ_sect.n > .55){
    circ_sect.disp_o = 7;
  }
  else
  {
    circ_sect.disp_o = circ_sect.r2pix*.707107 + 4;
  }
  circ_sect.push(
      input.text(xsect_left + 19,xsect_top+ 6,"Circular")
      .click(function(){select_xsect()} ),
      input.circle(xsect_left + xsect_w/2,
        xsect_top + xsect_h/2,
        circ_sect.r1pix).attr("fill","#BBB","stroke","#666"),
      input.circle(xsect_left + xsect_w/2,
        xsect_top + xsect_h/2,
        circ_sect.r2pix).attr("fill","#FFF","stroke","#666"),
      input.text(xsect_left + xsect_w/2 + circ_sect.disp_o,
        xsect_top + xsect_h/2 - (circ_sect.disp_o + 10),
        "r1"),
      input.arrow(xsect_left + xsect_w/2 + 5,
        xsect_top + xsect_h/2 - 5,
        xsect_left + xsect_w/2 + circ_sect.r1pix*.707107 - 2,
        xsect_top + xsect_h/2 - circ_sect.r1pix*.707107 + 2),
      input.arrow(xsect_left + xsect_w/2 + 6,
        xsect_top + xsect_h/2 - 6,
        xsect_left + xsect_w/2 + 1,
        xsect_top + xsect_h/2 - 1),
      input.text(xsect_left + xsect_w + 2,
        xsect_top + 5,
        "r1 = " + round(circ_sect.r1,4)).attr("text-anchor" , "start")
        .click(function(){select_xdims()}),
      input.text(xsect_left + xsect_w + 2,
          xsect_top + 15,
          "r2 = " + round(circ_sect.r2,4)).attr("text-anchor" , "start")
        .click(function(){select_xdims()}),
      input.text(xsect_left + xsect_w + 2,
          xsect_top + 28,
          "I = " + circ_sect.I.toPrecision(4)).attr("text-anchor","start")
        .click(function(){select_xdims()}),
      input.path("m" + (xsect_left ) + "," + (xsect_top+xsect_h/2) +
          "l" + xsect_w + "," + 0).attr("stroke-dasharray", "- "),
      input.text(xsect_left + xsect_w + 2,xsect_top+40,
          "NA at " + round(circ_sect.r1,4)).
        attr("text-anchor","start")
        );
  if(circ_sect.r2pix){
    circ_sect.push(
        input.text(xsect_left + xsect_w/2 + 20,
          xsect_top + xsect_h/2 + circ_sect.disp_o,
          "r2")
        );
  }
  if(circ_sect.r2pix > 8){
    circ_sect.push(
        input.arrow(xsect_left + xsect_w/2 + 5,
          xsect_top + xsect_h/2 + 5,
          xsect_left + xsect_w/2 + circ_sect.r2pix*.707107 - 2,
          xsect_top + xsect_h/2 + circ_sect.r2pix*.707107 - 2),
        input.arrow(xsect_left + xsect_w/2 + 6,
          xsect_top + xsect_h/2 + 6,
          xsect_left + xsect_w/2 + 1,
          xsect_top + xsect_h/2 + 1)
        );
  }
}



//draw rectangle section
draw_xrect = function (rec_sect){
  rec_sect.I = calc_I(rec_sect,"rect");
  var x_top,x_left,offy,offx;
  if(rec_sect.w/xsect_w > rec_sect.h/(xsect_h - 9)){
    x_scale = xsect_w*3/(4*rec_sect.w);
    x_top = xsect_top + xsect_h/2 - x_scale*rec_sect.h/2;
    x_left = xsect_left + xsect_w/8;
    offx = -5;
    offy = 5;
  } else {
    x_scale = (xsect_h-9)*3/(4*rec_sect.h);
    x_top = xsect_top + 9 + (xsect_h-9)/8;
    x_left = xsect_left + xsect_w/2 - x_scale*rec_sect.w/2;
    offx = 5;
    offy = -5;
  }
  rec_sect.clear();
  rec_sect.push(
      input.text(xsect_left + 30, xsect_top + 6, "Rectangular")
      .click(function(){select_xsect()} ),
      input.rect(x_left,
        x_top,
        rec_sect.w*x_scale,
        rec_sect.h*x_scale).attr("fill","#BBB","stroke","#666"),
      input.text(x_left + x_scale*rec_sect.w + 12*offx/5,
        xsect_top + xsect_h/2 - 10,
        "h"),
      input.arrow(x_left + x_scale*rec_sect.w + offx,
        x_top + x_scale*rec_sect.h/2,
        x_left + x_scale * rec_sect.w + offx,
        x_top + 2),
      input.arrow(x_left + x_scale*rec_sect.w + offx,
        x_top + x_scale*rec_sect.h/2,
        x_left + x_scale * rec_sect.w + offx,
        x_top + x_scale*rec_sect.h - 2),
      input.text(xsect_left + xsect_w/2,
        x_top + x_scale*rec_sect.h + 12*offy/5,
        "w"),
      input.arrow(xsect_left + xsect_w/2,
          x_top + x_scale*rec_sect.h + offy,
          x_left + 2,
          x_top + x_scale*rec_sect.h + offy),
      input.arrow(xsect_left + xsect_w/2,
          x_top + x_scale*rec_sect.h + offy,
          x_left + x_scale*rec_sect.w - 2,
          x_top + x_scale*rec_sect.h + offy),
      input.text(xsect_left + xsect_w + 2,
          xsect_top + 5,
          "w = " + round(rec_sect.w,4)).attr("text-anchor" , "start")
        .click(function(){select_xdims()}),
      input.text(xsect_left + xsect_w + 2,
          xsect_top + 15,
          "h = " + round(rec_sect.h,4)).attr("text-anchor" , "start")
        .click(function(){select_xdims()}),
      input.text(xsect_left + xsect_w + 2,
          xsect_top + 28,
          "I = " + rec_sect.I.toPrecision(4)).attr("text-anchor","start")
        .click(function(){select_xdims()}),
      input.path("m" + (xsect_left) + "," + (xsect_top+xsect_h/2) +
          "l" + xsect_w+ "," + 0).attr("stroke-dasharray", "- "),
      input.text(xsect_left + xsect_w + 2,xsect_top+40,
          "NA at " + round(rec_sect.h/2,4)).
        attr("text-anchor","start")
        );
}



//compute I
function calc_I(xsect,type){
  var I;
  switch(type){
    case "rect":
      I = xsect.h*xsect.h*xsect.h*xsect.w/12;
      break;
    case "circ":
      I = .0491*(Math.pow(xsect.r1,4) - Math.pow(xsect.r2,4));
      break;
    case "T":
      var h = xsect.h;
      var w = xsect.w;
      var t = xsect.t;
      var b = xsect.b;
      var c = xsect.NA;
      I = (1/12)*(b*Math.pow(h-t,3) + w*t*t*t) + w*t*Math.pow(h-t-c+t/2,2) +
        b*(h-t)*Math.pow(c-(h-t)/2,2);
      break;
    default:
      break;
  }
  return I;
}

