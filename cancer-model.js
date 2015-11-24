 /**
 * Implements the processing of logs from running the cancer model
 * Authors: Ken Kahn
 * License: to be decided
 */

 (function () {
 	// create a local scope so there is no change of name conflicts

 	var cell_states = []; // index is the tick number and the contents are the visual states of cells current at that time

 	var initialize = function () {
 	   	var cell_numbers = []; // ids of cells currently alive
 	   	var current_cell_states = []; // the graphical state of each current cell
 	   	var tick, events;
        if (typeof l === 'undefined') { // the log has the short name 'l' to keep down bandwidth and file sizes
        	document.write("Simulation is not finished. Please refresh this page later.");
        	return;
        }
        for (tick = 1; tick < l.length; tick++) {
            events = l[tick];
            if (events) {
                events.forEach(function (event) {
                     var index;
                     if (event.added) {
                         cell_numbers.push(event.added);
                     } else if (event.removed) {
                         index = cell_numbers.indexOf(event.removed);
                         cell_numbers = cell_numbers.splice(index, 1);
                     } else if (event.changed) {
                         event.changed.who = event.who;
                         current_cell_states[event.who] = event.changed;
                     }
                });
            }
            cell_states[tick] = cell_numbers.map(function (cell_number) {
                return current_cell_states[cell_number];
            });
        }
        canvas = document.getElementById("canvas");
        display_cell = running_3D ? display_cell_3D : display_cell_2D;
        if (running_3D) {
            create_3D_context();
        } else {
            create_2D_context();
        }
        // run with animation time proportional to simulation time (if computer is fast enough)
        animate_cells(20, 20, false, 10);
        // display changed frames every 100 milliseconds
//         animate_cells(20, 100, true);
 	};

 	var display_cell_2D = function (cell, scale, radius, color) {
 	    context_2D.fillStyle = color;
 	    context_2D.beginPath();
 	    // adjust coordinates to avoid negative coordinates and scale to a larger size
 	    context_2D.arc((1+cell.x-minimum_x)*scale, (1+maximum_y-cell.y)*scale, radius*scale, 0, Math.PI*2);
 	    context_2D.fill();
 	    context_2D.stroke();
 	};

 	var clear_all = function () {
 	    context_2D.clearRect(0, 0, canvas.width, canvas.height);
 	};

 	var create_2D_context = function () {
 	    context_2D = canvas.getContext("2d");
 	};

 	var animate_cells = function (scale, frame_duration, skip_unchanging_frames, skip_every_n_frames) {
        var tick = 1;
        var display_frame = function () {
            var cells = cell_states[tick];
            cells.forEach(function (cell) {
                 var radius = (cell.s || default_size)/2;
                 var color =   cell.c || default_color;
 	             display_cell(cell, scale, radius, color);
 	        });
            tick++;
 	        if (skip_unchanging_frames) {
 	            // find next time where an event was logged
                while (l[tick] === undefined && tick < l.length) {
                    tick++;
                }
 	        } else if (skip_every_n_frames) {
 	            // already added 1 so skip 1 less than skip_every_n_frames
 	            tick += skip_every_n_frames-1;
 	        }
 	        if (cell_states[tick]) {
                setTimeout(function () {
                               clear_all();
                               display_frame();
                           },
                           frame_duration);
 	        }
        };
        // set canvas size as just a little bit bigger than needed
        canvas.width  = (2+maximum_x-minimum_x) *scale;
        canvas.height = (2+maximum_y-minimum_y)*scale;
        display_frame();
 	};

 	var canvas, context_2D, display_cell;

    // initialize when the page has been loaded
 	document.addEventListener('DOMContentLoaded', initialize);

 }());