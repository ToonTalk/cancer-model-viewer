 /**
 * Implements the processing of logs from running the cancer model
 * Authors: Ken Kahn
 * License: to be decided
 */

 (function () {
 	// create a local scope so there is no change of name conflicts

 	var replicate_states = []; // an array of cell_states for each replicate (run of the model)

 	var canvases = [];         // contains one canvas for each replicate

 	var last_tick = 0;         // the last time when an event happened in any of the replicates

 	var icon_size = 5;         // size when an icon

 	var expanded_size = 30;    // size when running expanded

 	var canvas_click_listener = function (event) {
 	    var canvas = event.target;
 	    var new_canvas = document.createElement("canvas");
 	    var index = canvases.indexOf(event.target);
 	    var replicate_states_singleton = [replicate_states[index]];
 	    var canvases_singleton = [new_canvas];
 	    var remove_canvas = function () {
 	        document.getElementById('canvases').removeChild(canvas_and_caption_div);
 	    }
 	    var time_monitor_id = "time-monitor-of-" + index;
 	    var canvas_and_caption_div = document.createElement('div');
 	    var caption = document.createElement('p');
 	    caption.innerHTML = "Animation of replicate #" + (index+1) + " at time <span id='" + time_monitor_id + "'>0</span>. Click to remove it.";
 	    canvas_and_caption_div.appendChild(new_canvas);
 	    canvas_and_caption_div.appendChild(caption);
 	    document.getElementById('canvases').appendChild(canvas_and_caption_div);
 	    new_canvas.addEventListener('click', remove_canvas);
 	    // animate this single replicate at a larger size
 	    animate_cells(replicate_states_singleton, canvases_singleton, expanded_size, 20, false, 20, time_monitor_id);
 	};

 	var initialize = function () {
 	   	var tick, events;
        if (typeof l === 'undefined') { // the log has the short name 'l' to keep down bandwidth and file sizes
        	document.write("Simulation is not finished. Please refresh this page later.");
        	return;
        }
        write_page();
        display_cell = running_3D ? display_cell_3D : display_cell_2D;
        clear_all    = running_3D ? clear_all_3D    : clear_all_2D;
        replicates.forEach(function (replicate) {
            var cell_numbers = [];        // ids of cells currently alive
 	   	    var current_cell_states = []; // the graphical state of each current cell
 	   	    var cell_states = [];      // index is the tick number and the contents are the visual states of cells current at that time
            for (tick = 1; tick < replicate.length; tick++) {
                events = replicate[tick];
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
            if (last_tick < replicate.length) {
                last_tick = replicate.length;
            }
            replicate_states.push(cell_states);
            canvas = document.createElement("canvas");
            canvas.addEventListener('click', canvas_click_listener);
            document.getElementById('canvases').appendChild(canvas);
            canvases.push(canvas);
        });
        // run with animation time proportional to simulation time (if computer is fast enough)
        animate_cells(replicate_states, canvases, icon_size, 20, false, 20, 'canvases-time');
        // display changed frames every 100 milliseconds -- only works for a single canvas
//         animate_cells(replicates, canvases, 20, 100, true); 
 	};

 	var display_cell_2D = function (cell, scale, radius, color) {
 	    context_2D.fillStyle = color;
 	    context_2D.beginPath();
 	    // adjust coordinates to avoid negative coordinates and scale to a larger size
 	    context_2D.arc((1+cell.x-minimum_x)*scale, (1+maximum_y-cell.y)*scale, radius*scale, 0, Math.PI*2);
 	    context_2D.fill();
 	    context_2D.stroke();
 	};

 	var clear_all_2D = function (tick) {
 	    canvases.forEach(function (canvas, index) {
 	        if (tick < replicates.length) {
 	            // don't clear if on the last frame
 	            canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
 	        }
 	    }); 
 	};

 	var animate_cells = function (replicate_states, canvases, scale, frame_duration, skip_unchanging_frames, skip_every_n_frames, time_monitor_id, callback) {
        var tick = 1;
        var display_frame = function () {
            if (document.getElementById(time_monitor_id)) {
                document.getElementById(time_monitor_id).textContent = tick.toString();
            }
            replicate_states.forEach(function (cell_states, index) {
                var cells = cell_states[tick];
                var canvas = canvases[index];
                var log = replicates[index];
                if (!cells) {
                    return; // this replicate is finished
                }
                // set canvas size as just a little bit bigger than needed
                canvas.width  = (2+maximum_x-minimum_x) *scale;
                canvas.height = (2+maximum_y-minimum_y)*scale;
                if (!running_3D) {
                    context_2D = canvas.getContext("2d");
                }
                cells.forEach(function (cell) {
                     var radius = (cell.s || default_size)/2;
                     var color =   cell.c || default_color;
                     display_cell(cell, scale, radius, color);
                });
            });
            tick++;
            if (skip_unchanging_frames) {
                // find next time where an event was logged
                while (log[tick] === undefined && tick < log.length) {
                    tick++;
                }
            } else if (skip_every_n_frames) {
                // already added 1 so skip 1 less than skip_every_n_frames
                tick += skip_every_n_frames-1;
            }
            if (tick <= last_tick) {
                setTimeout(function () {
                               clear_all(tick);
                               display_frame();
                           },
                           frame_duration);
            } else if (callback) {
                callback();
            }
        };
        display_frame();
 	};

 	var write_page = function () {
 	    document.write("<p>Results from running the cancer model with these settings:</p>");
 	    document.write("<p><i>to be done</i></p>");
 	    document.write("<p>Here is an animation of the model running " + replicates.length + " times. Time is " + "<span id='canvases-time'>0</span>. To inspect a replicate click on it.</p>");
        document.write("<div id='canvases'></div>");
        document.write("<p>Here are some graphs:</p>");
        document.write("<p><i>to be done</i></p>");
 	};

 	var context_2D,     // used to draw upon the 2D canvas
 	    display_cell,   // function to display a cell
 	    clear_all;      // function to clear all displays

    // initialize when the page has been loaded
 	document.addEventListener('DOMContentLoaded', initialize);

 }());