define(['ginger'], function(ginger){

  // Declare a Bubble Chart View inheriting from CanvasView
  var BubbleChart= ginger.Declare(ginger.CanvasView, function(collection, options){
    var self = this;

    self.super(BubbleChart);
    
    self.options = options
    if(_.isUndefined(options)){
      self.options = {}
    }
    
    self.options = _.defaults(self.options, {
      axesColor: 'gray'
    });
    
    self.on('options', function(options, prev){
      _.extend(prev, options)
      ruler.options = prev
    });

    self.on('collection', function(val, old){
      old && old.release();
      val.retain();
      val.on('updated: added: deleted:', function(){
        self.draw();
      });
    });

    self.set('collection', collection);
    collection.emit('updated:');
  });

  // Helper functions
  function drawLine(ctx, x0, y0, x1, y1, color){
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.closePath()
    ctx.stroke()
  }
  
  function drawBubble(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2, true); 
    ctx.closePath();
    ctx.fill();
  }

  // Override draw() function
  BubbleChart.prototype.draw = function(){
    var ctx = this.super(BubbleChart, 'draw')

    if (ctx===null) return;

    var options = this.options,
        width = ctx.canvas.width,
        height = ctx.canvas.height,
        offset = {
          x: width / 2,
          y: height / 2
        };

    ctx.clearRect(0, 0, width, height);

    // Draw axes
    drawLine(ctx, 0, offset.y, width, offset.y, options.axesColor);
    drawLine(ctx, offset.x, 0, offset.x, height, options.axesColor);

    // Draw bubbles
    var items = this.collection.items;
    $.each(items, function(i, item) {
      var
        x = offset.x + item.x,
        y = offset.y + item.y,
        r = item.r;

      // create radial gradient
      var grd = ctx.createRadialGradient(x - (r/4), y - (r/3), (r/6), x, y, r);
      // light blue
      grd.addColorStop(0, "hsla(10, 99%, 90%, 0.84)");
      // dark blue
      grd.addColorStop(1, "hsla(10, 99%, 40%, 0.84)");
      
      drawBubble(ctx, x, y, r, grd);
    });
  }

  return BubbleChart;
});
