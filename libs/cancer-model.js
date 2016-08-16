 /**
 * Implements the processing of logs from running the cancer model
 * Authors: Ken Kahn and Martin Hadley
 * License: to be decided
 */

 (function () {
 	"strict"
    // create a local scope so there is no chance of name conflicts

    var replicate_states = [];                      // an array of cell_states for each replicate (run of the model) - index is tick number

    var previous_replicate_states_singleton;        // a singleton array containing the replicate currently animating

    var replicate_apoptosis_values = [];            // an array an array of the cumulative number of apoptosis events for each replicate - index is tick number

    var replicate_growth_arrest_values = [];        // an array an array of the cumulative number of growth_arrest events for each replicate - index is tick number

    var replicate_proliferation_values = [];        // an array an array of the cumulative number of proliferation events for each replicate - index is tick number

    var replicate_necrosis_values = [];             // an array an array of the cumulative number of necrosis events for each replicate - index is tick number

    var apoptosis_mean = [];                        // the mean apoptosis values at each tick

    var growth_arrest_mean = [];                    // the mean growth_arrest values at each tick

    var proliferation_mean = [];                    // the mean proliferation values at each tick

    var necrosis_mean = [];                         // the mean necrosis values at each tick

    var apoptosis_standard_deviation = [];          // standard deviation at each tick of the apoptosis values

    var growth_arrest_standard_deviation = [];      // standard deviation at each tick of the growth_arrest values

    var proliferation_standard_deviation = [];      // standard deviation at each tick of the proliferation values

    var necrosis_standard_deviation = [];           // standard deviation at each tick of the necrosis values

    var canvases = [];                              // contains one canvas for each replicate

    var last_tick = 0;                              // the last time when an event happened in any of the replicates

    var icon_size = 5;                              // size when an icon

    var expanded_size = 16;                         // size when running expanded

    var scene, camera, renderer, 
        statistics_3D, webGL_output;                // for displaying 3D

    var network_graphs = [];

    var canvas_click_listener = function (event, index) {
        var canvas = event.target;
        var index = canvases.indexOf(event.target);
        var replicate_states_singleton = [replicate_states[index]];
        var caption_element = document.getElementById('canvases-caption');
        var remove_canvas = function () {
            animation_and_graph_table.parentElement.removeChild(animation_and_graph_table);
            replicate_states_singleton[0] = null; // to stop the animation
        }
        var time_monitor_id = "time-monitor-of-" + index;
        var animation_and_graph_table = document.createElement('table');
        var animation_row             = document.createElement('tr');
        var graph_row                 = document.createElement('tr');
        var animation_table_header    = document.createElement('td');
        var animation_table_cell      = document.createElement('td');
        var graph_table_header        = document.createElement('td');
        var graph_table_cell          = document.createElement('td');
        var close_button              = document.createElement('button');
        var close_button_and_catption = document.createElement('div');
        var caption = document.createElement('p');
        var graphs = document.createElement('div');
        var add_network_graph = function (gene_graph, table, caption) {
        	var tr1 = document.createElement('tr');
        	var td1 = document.createElement('td');
        	var tr2 = document.createElement('tr');
        	var td2 = document.createElement('td');
        	var caption_div = document.createElement('div');
        	caption_div.innerHTML = caption;
        	td1.appendChild(caption_div);
        	tr1.appendChild(td1);
        	table.appendChild(tr1);
			td2.appendChild(gene_graph);
			tr2.appendChild(td2);
			table.appendChild(tr2);
        };
        var caption_html = function (color) {
        	return "<h3>Network for <span style='width:32px;height:32px;border-radius:32px;background-color:" + color + ";'></div> cells</h3>";
        };
        var canvas_td = document.createElement('td');
        var new_canvas, canvases_singleton;
        if (previous_replicate_states_singleton) {
        	// stop the previous animation
        	previous_replicate_states_singleton[0] = null;
        }
//         animation_and_graph_table.title = "Click to close this inspection of replicate #" + (index+1) + ".";
        caption.innerHTML = "<tr><td>Animation of replicate #" + (index+1) + " at time <span id='" + time_monitor_id + "'>0</span>.</td></tr>";
//         animation_table_header.appendChild(caption);
        graph_table_header.textContent = "Data from replicate #" + (index+1);
//         animation_row.appendChild(animation_table_header);
        graph_row.appendChild(graph_table_header);
        if (running_3D) {
//             animation_row.appendChild(statistics_3D);
			canvas_td.appendChild(webGL_output)
        } else {
            new_canvas = document.createElement('canvas');
            canvases_singleton = [new_canvas];
            canvas_td.appendChild(new_canvas);
        }
        animation_row.appendChild(canvas_td);
        close_button_and_catption.appendChild(caption);
        close_button_and_catption.appendChild(close_button);
        animation_and_graph_table.appendChild(close_button_and_catption);
        animation_and_graph_table.appendChild(animation_row);
        if (typeof gene_nodes !== 'undefined') {
        	if (network_graphs.length === 0) {
				// gene_nodes has the gene_nodes of each clone type (i.e. mutation_number)
				gene_nodes.forEach(function (ignore, mutation_number) {
									var callback = function () {
											          network_graphs[mutation_number] = gene_graph;
													  gene_graph.title = "Redder colours indicate higher percent of this gene in all of this clone type are active. You can zoom and pan.";
												   };
								    var gene_graph = create_network_graph(callback, mutation_number, 800, 500);
									add_network_graph(gene_graph, animation_and_graph_table, caption_html(default_colors[mutation_number-1]));						
				});
        	} else {
        		// already created network
				network_graphs.forEach(function (gene_graph, index) {
					                       add_network_graph(gene_graph, animation_and_graph_table, caption_html(default_colors[index]));
				});
        	}
        } 
        graph_row.appendChild(graphs);
        animation_and_graph_table.appendChild(graph_row);
        close_button.textContent = "Close inspection of replicate #" + (index+1);
        graphs.id = "replicate-#" + index;
        // perhaps better to set the dimensions using the Plotly API
        graphs.style.width  = "600px";
        graphs.style.height = "400px";
        caption_element.parentElement.insertBefore(animation_and_graph_table, caption_element);
        close_button.addEventListener('click', remove_canvas);
        // animate this single replicate at a larger size
        animate_cells(replicate_states_singleton, canvases_singleton, expanded_size, 20, false, 2, time_monitor_id);
        display_replicate(graphs.id, "Cell events for replicate #" + (index+1), replicate_proliferation_values[index], replicate_apoptosis_values[index], replicate_growth_arrest_values[index], replicate_necrosis_values[index]);
        previous_replicate_states_singleton = replicate_states_singleton;
    };

    var initialize = function () {
        var mean = function (tick, values) {
            var sums = [];
            var sample_count = 0;
            values.forEach(function (replicate_values) { 
                if (replicate_values[tick] !== undefined) {
                    sums[tick] = (sums[tick] || 0)+replicate_values[tick];
                    sample_count++;
                }
            });
            if (sample_count > 0) {
                return sums[tick]/sample_count;
            } 
            return 0;
        };
        var standard_deviation = function (tick, values, mean) {
            var sum_of_square_of_difference = [];
            var sample_count = 0;
            values.forEach(function (replicate_values, index) { 
                if (replicate_values[tick] !== undefined) { 
                    sum_of_square_of_difference[tick] = (sum_of_square_of_difference[tick] || 0)+Math.pow(replicate_values[tick]-mean[tick], 2);
                    sample_count++;
                }
            });
            if (sample_count > 1) {
                // https://en.wikipedia.org/wiki/Standard_deviation#Corrected_sample_standard_deviation explains why -1 below
                return Math.sqrt(sum_of_square_of_difference[tick]/(sample_count-1));
            } 
            return 0;
        };
        var display_mean_label = function (event_type) {
            return "Mean cumulative " + event_type + " events averaged over " + replicates.length + " simulation runs";
        };
        var display_all_label = function (event_type) {
            return "cumulative " + event_type + " events for all " + replicates.length + " simulation runs";
        };
        // log file is same as HTML but with LOG extension
        var log_url = window.location.pathname.substring(0, window.location.pathname.length-4) + "log";
        var tick, events;
        if (typeof l === 'undefined' || replicates.length === 0) { 
            // the log has the short name 'l' to keep down bandwidth and file sizes
            document.write("Simulation is not finished. Please refresh this page later. See the <a href='" + log_url + "' target='_blank'>server log file</a>.");
            return;
        }
        write_page();
        clear_all    = running_3D ? clear_all_3D    : clear_all_2D;
        replicates.forEach(function (replicate, index) {
            var cell_numbers = [];                // ids of cells currently alive
            var current_cell_states = [];         // the graphical state of each current cell
            var cell_states = [];                 // index is the tick number and the contents are the visual states of cells current at that time
            var apoptosis_values = [];            // an array of the cumulative number of apoptosis events for this replicate - index is tick number
            var growth_arrest_values = [];        // an array of the cumulative number of growth_arrest events for this replicate - index is tick number
            var proliferation_values = [];        // an array of the cumulative number of proliferation events for this replicate - index is tick number
            var necrosis_values = [];             // an array of the cumulative number of necrosis events for this replicate - index is tick number
            var necrosis_standard_deviation = [];
            var current_apoptosis     = 0;
            var current_growth_arrest = 0;
            var current_proliferation = 0;
            var current_necrosis      = 0;
            var statistics;
            for (tick = 1; tick < replicate.l.length; tick++) {
                events     = replicate.l[tick];
                statistics = replicate.s[tick];
                if (events) {
                    events.forEach(function (event) {
                         var index;
                         if (event.added) {
                             cell_numbers.push(event.added);
                         } else if (event.removed) {
                             index = cell_numbers.indexOf(event.removed);
                             cell_numbers.splice(index, 1);
                         } else if (event.changed) {
                             // for backwards compatibility for sample outputs -- remove when they are recreated
                             event.changed.who = event.who;
                             current_cell_states[event.who] = event.changed;
                         } else if (event.who) {
                             current_cell_states[event.who] = event;
                         }
                    });
                }
                cell_states[tick] = cell_numbers.map(function (cell_number) {
                    return current_cell_states[cell_number];
                });
                if (statistics) {
                    if (statistics.apoptosis) {
                        current_apoptosis     = statistics.apoptosis;
                    }
                    if (statistics.growth_arrest) {
                        current_growth_arrest = statistics.growth_arrest;
                    }
                    if (statistics.proliferation) {
                        current_proliferation = statistics.proliferation;
                    }
                    if (statistics.necrosis) {
                        current_necrosis      = statistics.necrosis;
                    }
                }
                apoptosis_values[tick]     = current_apoptosis;
                growth_arrest_values[tick] = current_growth_arrest;
                proliferation_values[tick] = current_proliferation;
                necrosis_values[tick]      = current_necrosis;
            }
            if (last_tick < replicate.l.length) {
                last_tick = replicate.l.length;
            }
            replicate_states.push(cell_states);
            replicate_apoptosis_values    .push(apoptosis_values);
            replicate_growth_arrest_values.push(growth_arrest_values);
            replicate_proliferation_values.push(proliferation_values);
            replicate_necrosis_values     .push(necrosis_values);
            canvas = document.createElement("canvas");
            canvas.title = "Click to inspect replicate #" + (index+1);
            canvas.addEventListener('click', function (event) {
                                                 canvas_click_listener(event, index);
                                             });
            document.getElementById('canvases').appendChild(canvas);
            canvases.push(canvas);
        });
        for (tick = 1; tick < last_tick; tick++) {
            apoptosis_mean[tick]     = mean(tick, replicate_apoptosis_values);
            growth_arrest_mean[tick] = mean(tick, replicate_growth_arrest_values);
            proliferation_mean[tick] = mean(tick, replicate_proliferation_values);
            necrosis_mean[tick]      = mean(tick, replicate_necrosis_values);
            apoptosis_standard_deviation[tick]      = standard_deviation(tick, replicate_apoptosis_values, apoptosis_mean);
            growth_arrest_standard_deviation[tick]  = standard_deviation(tick, replicate_growth_arrest_values, growth_arrest_mean);
            proliferation_standard_deviation[tick]  = standard_deviation(tick, replicate_proliferation_values, proliferation_mean);
            necrosis_standard_deviation[tick]       = standard_deviation(tick, replicate_necrosis_values, necrosis_mean);
        }
        if (proliferation_mean[proliferation_mean.length-1]) {
            // not all zeros
            display_mean("mean-proliferation", display_mean_label("proliferation"), proliferation_mean, proliferation_standard_deviation);
            display_all( "all-proliferation",  display_all_label ("proliferation"), replicate_proliferation_values);
        }
        if (apoptosis_mean[apoptosis_mean.length-1]) {
            display_mean("mean-apoptosis", display_mean_label("apoptosis"), apoptosis_mean, apoptosis_standard_deviation);
            display_all( "all-apoptosis",  display_all_label ("apoptosis"), replicate_apoptosis_values, apoptosis_mean, apoptosis_standard_deviation);
        }
        if (growth_arrest_mean[growth_arrest_mean.length-1]) {
            display_mean("mean-growth_arrest", display_mean_label("growth arrest"), growth_arrest_mean, growth_arrest_standard_deviation);
            display_all( "all-growth_arrest",  display_all_label ("growth arrest"), replicate_growth_arrest_values, growth_arrest_mean, growth_arrest_standard_deviation);
        }
        if (necrosis_mean[necrosis_mean.length-1]) {
            display_mean("mean-necrosis", display_mean_label("necrosis"), necrosis_mean, necrosis_standard_deviation);
            display_all( "all-necrosis",  display_all_label ("necrosis"), replicate_necrosis_values, necrosis_mean, necrosis_standard_deviation);
        }
        if (running_3D) {
            initialise_3D();
        }
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

    var clear_all_2D = function (replicate_states, canvases, tick) {
        canvases.forEach(function (canvas, index) {
            if (tick < replicates[index].length) {
                // don't clear if on the last frame
                canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
            }
        }); 
    };

    var initialise_3D = function () {
        var step = 0;
		var paused = 0;
		var pausedstring = "";

        statistics_3D = document.createElement('div');            
        webGL_output  = document.createElement('div');
//         statistics_3D.id = 'Stats-output'; // not used?
//         webGL_output.id  = 'WebGL-output';
		
		//set up scene and camera
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
		camera.userData = { keepMe: true };
		
		//create renderer object
        renderer = new THREE.WebGLRenderer();
        renderer.setClearColor(new THREE.Color(0xEEEEEE, 1.0));
        renderer.shadowMapEnabled = true;
        
		//initialise click and drag rotation
		controls = new THREE.OrbitControls( camera, renderer.domElement );
		controls.enableDamping = true;
		controls.dampingFactor = 0.25;
		controls.enableZoom = false;
		
        // position and point the camera to the center of the scene
        camera.position.x = -10;
        camera.position.y = 15;
        camera.position.z = 10;
        camera.lookAt(scene.position);

        // add ambient lighting
        var ambientLight = new THREE.AmbientLight(0x0c0c0c);
		ambientLight.userData = { keepMe: true };
        scene.add(ambientLight);

        // Rowan suggested the following is better lighting:

        //add light (1)
        var pointLight1 = new THREE.PointLight(0xffffff);
        pointLight1.position.set(-400, -400, -400);
        pointLight1.userData = { keepMe: true };
        scene.add(pointLight1);
		
		//add light (2)
        var pointLight2 = new THREE.PointLight(0xffffff);
        pointLight2.position.set(400, 400, 400);
        pointLight2.userData = { keepMe: true };
        scene.add(pointLight2);

        // more lights added by Ken
        //add light (3)
        var pointLight3 = new THREE.PointLight(0xffffff);
        pointLight3.position.set(-400, 400, -400);
        pointLight3.userData = { keepMe: true };
        scene.add(pointLight3);
		
		//add light (4)
        var pointLight4 = new THREE.PointLight(0xffffff);
        pointLight4.position.set(400, -400, 400);
        pointLight4.userData = { keepMe: true };
        scene.add(pointLight4);

        //add upper spotlight (1)
//         var spotLight1 = new THREE.SpotLight(0xffffff);
//         spotLight1.position.set(-40, 60, -10);
//         spotLight1.castShadow = true;
// 		spotLight1.userData = { keepMe: true };
//         scene.add(spotLight1);
		
		//add lower spotlight (2)
//         var spotLight2 = new THREE.SpotLight(0xffffff);
//         spotLight2.position.set(-40, -60, -10);
//         spotLight2.castShadow = true;
// 		spotLight2.userData = { keepMe: true };
//         scene.add(spotLight2);

        //add another spotlight (3)
//         var spotLight3 = new THREE.SpotLight(0xffffff);
//         spotLight3.position.set(40, -60, -50);
//         spotLight3.castShadow = true;
// 		   spotLight3.userData = { keepMe: true };
//         scene.add(spotLight3);

        // add the output of the renderer to the dom
        webGL_output.appendChild(renderer.domElement);

			//set up the dat.gui controls for steps-per-frame, pause, unpause and reset gui elements
// 			var controls = new function () {
//             this.stepsperframe = 5;
// 			this.pause = function () {paused = 1; pausedstring = "PAUSED"}
// 			this.unpause = function () {paused = 0; pausedstring = ""}
// 			this.resetsteps = function () {step = 0; clearScene ();}
// 											};
// 			var gui = new dat.GUI();
// 			gui.add(controls, 'stepsperframe').min(1).max(100).step(1);
// 			gui.add(controls, 'pause')
// 			gui.add(controls, 'unpause')
// 			gui.add(controls, 'resetsteps')
        
		
		//set up step count (and paused) text div
// 		var stepcounttext = document.createElement('div');
// 		stepcounttext.style.position = 'absolute';
// 		stepcounttext.style.width = 100;
// 		stepcounttext.style.height = 100;
// 		stepcounttext.style.backgroundColor = "blue";
// 		stepcounttext.innerHTML = "no ticks yet";
// 		stepcounttext.style.top = 0 + 'px'
// 		stepcounttext.style.left = 100 + 'px';
// 		document.body.appendChild(stepcounttext);
    };

    var display_cell_3D = function (cell, scale, radius, color) {
		var sphereGeometry = new THREE.SphereGeometry(0.75, radius*scale, radius*scale);
		var sphereMaterial = new THREE.MeshPhongMaterial({color: color});
		var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
		sphere.position.x = cell.x;
		sphere.position.y = cell.y;
		sphere.position.z = cell.z;
		scene.add(sphere);
// 		sphere.name = "cell_" + cell.who;
    };

    // a function to create a hitlist of killable meshes and kill them
    var clear_all_3D = function (replicates, canvases, tick) {  	
		var to_remove = [];
		if (replicates[0] && tick >= replicates[0].length) {
            // don't clear if on the last frame
            return;
		}
		// alternatively the following could remove the last child first to avoid clobbering the structue as one traverses it
		scene.traverse (function( child ) {
                        if ( child instanceof THREE.Mesh) { //} && !child.userData.keepMe === true ) {
                                to_remove.push( child );
                        }});
   	    for ( var i = 0; i < to_remove.length; i++ ) {
			scene.remove( to_remove[i] );
			// see http://stackoverflow.com/questions/12945092/memory-leak-with-three-js-and-many-shapes?rq=1
			to_remove[i].geometry.dispose();
			to_remove[i].material.dispose();
        }
    };
    var animate_cells = function (replicate_states, canvases, scale, frame_duration, skip_unchanging_frames, skip_every_n_frames, time_monitor_id, callback) {
        var tick = 1;
        var mouse_move_listener = function (event) {      	            
            renderer.render(scene, camera);
        };
        var rgb_to_hex = function(color) {
        	// based on http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
            color = color.replace(/\s/g,"");
            // remove decimal point that might be in the alpha fraction
            color = color.replace(".","");
            var aRGB = color.match(/^rgb\((\d{1,3}[%]?),(\d{1,3}[%]?),(\d{1,3}[%]?)\)$/i);
            if (!aRGB) {
                // was not rgb so try rgba
                aRGB = color.match(/^rgba\((\d{1,3}[%]?),(\d{1,3}[%]?),(\d{1,3}[%]?),(\d{1,3}[%]?)\)$/i);
            }
            if (aRGB) {
                color = '';
                for (var i=1;  i<=3; i++) color += Math.round((aRGB[i][aRGB[i].length-1]=="%"?2.55:1)*parseInt(aRGB[i])).toString(16).replace(/^(.)$/,'0$1');
             } else {
                color = color.replace(/^#?([\da-f])([\da-f])([\da-f])$/i, '$1$1$2$2$3$3');
             }
             return '#'+color;
		};
        var display_frame = function () {
            // display 3D the selected replicate -- not the miniatures
            var display_cell = running_3D && replicate_states.length === 1 ? display_cell_3D : display_cell_2D;
            // three.js wants colours as hex not rgba(...) strings
            var colors = running_3D && replicate_states.length === 1 ? default_colors.map(function (color) {return rgb_to_hex(color)}) : default_colors;
            var animate_network = function (activation_fractions) {
            	var current_activation_fractions = activation_fractions[tick];
            	var activation_color = function (fraction) {
            		// given a number between 0 and 1 computes a color between white (0) and green (1)
            		// square the fraction to make the differences more apparent 
            		var shade = (1-fraction*fraction); 	
            		return "rgba(" + Math.round(fraction*255) + ",127," + Math.round(shade*255) + ",1)";
            	};
            	if (!current_activation_fractions) {
            		// this is recorded every other tick so use previous one
            		current_activation_fractions = activation_fractions[tick-1];
            	}
            	if (current_activation_fractions && gene_nodes.length === network_graphs.length) {
            		// the network graphs have stabilsed
            		network_graphs.forEach(function (network_graph, index) {
											   var network_information = network_graph.network_information;
											   var update_color = function (node_label) {
												   var fraction = current_activation_fractions[index][node_label];
												   var node_with_label;
												   network_information.nodes.get().some(function (node) {
													   if (node.label === node_label) {
														   node_with_label = node;
														   return true;
													   }
												   });
												   if (node_with_label) {
												   	   node_with_label.color = activation_color(fraction);
												       node_with_label.title = node_label + " is active in " + Math.round(100*fraction) + "% of the cells of this clone type.";
												   	   network_information.nodes.update(node_with_label);
												   }
											   };
											   if (current_activation_fractions[index]) {
											   	   Object.keys(current_activation_fractions[index]).forEach(update_color);
											   }
											});
            	}
            }
            if (!replicate_states[0]) {
            	// stopped
            	return;
            }
            if (document.getElementById(time_monitor_id)) {
                document.getElementById(time_monitor_id).textContent = tick.toString();
            }
            replicate_states.forEach(function (cell_states, index) {
                var cells = cell_states[tick];
                var log = replicates[index];
                var canvas;
                if (!cells) {
                	if (running_3D && replicate_states.length === 1) {
                		renderer.context.canvas.addEventListener('mousemove', mouse_move_listener);
                	}
                    return; // this replicate is finished
                }
                if (running_3D && replicate_states.length === 1) {             
                    renderer.setSize(2*(2+maximum_x-minimum_x)*scale, 2*(2+maximum_y-minimum_y)*scale);
                } else {
                    canvas = canvases[index];
                    // set canvas size as just a little bit bigger than needed
                    canvas.width  = (2+maximum_x-minimum_x)*scale;
                    canvas.height = (2+maximum_y-minimum_y)*scale;
                    context_2D = canvas.getContext("2d");
                }
                cells.forEach(function (cell) {
                     var radius = (cell.s || default_size)/2;
                     var color;
                     if (typeof colors !== "undefined") {
                         color = colors[cell.c || 0];
                     } else {
                         // backwards compatibility with old log files
                         color = cell.c || default_color
                     }
                     display_cell(cell, scale, radius, color);
                });
                animate_network(log.a);
            });
            if (running_3D && replicate_states.length === 1) {
                renderer.render(scene, camera);
            }
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
                               clear_all(replicate_states, canvases, tick);
                               display_frame();
                           },
                           frame_duration);
            } else if (callback) {
                callback();
            } else if (running_3D && replicate_states.length === 1) {
                renderer.context.canvas.addEventListener('mousemove', mouse_move_listener);
            }
        };
        display_frame();
    };

    var create_network_graph = function (callback, mutation_number, width, height, gene_font, input_output_font) {
 	    var options = {width:  width+"px",
 	                   height: height+"px",
 	                   edges: {arrows: 'to'},
				       nodes: {color: 'yellow',
 	                           font: gene_font || '16px arial white'},
 	                   // layout should not change on refresh or when comparing similar networks
 	                   layout: {randomSeed: 0}};
 	    var graph_div = document.createElement('div');
        var angle = 5*Math.PI/4; // 315 degrees (north west)
        var background_cell_color = function (rgba) {
        	var last_comma_index = rgba.lastIndexOf(',');
        	return rgba.substring(0, last_comma_index+1) + " .05)";
        };
        var cell_outline = {id: 0,
                            color: background_cell_color(default_colors[mutation_number-1]),
                            label: ' ',
                            physics: false,
                            fixed: true};
        var radius = Math.min(width, height)/2;
        var center_x_dom = width/2;
        var center_y_dom = height/2;
        var update_gene_positions = function () {
        	// updates nodes whose positions are more than radius from the center
        	var corrected_distance_to_center = radius*0.9;
        	var center = network.DOMtoCanvas({x: center_x_dom,
        	                                  y: center_y_dom});
        	var gene_positions = network.getPositions(gene_nodes[mutation_number].map(function (node) { return node.id}));
        	var position, node, position_in_dom, x_distance, y_distance, distance, angle;
        	gene_nodes[mutation_number].forEach(function (node) {
        		var scale = network.getScale();
        		var correction;
				position = gene_positions[node.id];
        		position_in_dom = network.canvasToDOM(position);
        		x_distance = position_in_dom.x-center_x_dom;
        		y_distance = position_in_dom.y-center_y_dom;
        		distance = Math.sqrt(x_distance*x_distance+y_distance*y_distance);
        		if (distance+30 > radius) { // is too close to the edge of the circle representing the cell
        			angle = Math.atan2(y_distance, x_distance);
        			// move it towards the centre by twice the amount it is outside the circle or 1/10th of the radius whichever is larger
        			correction = Math.max(radius/10, (distance-radius)*2)/scale; 
        			node.x = position.x-Math.cos(angle)*correction;
        			node.y = position.y-Math.sin(angle)*correction;
//                  nodes.add({id: node.id+1000, label: node.label, color: 'red', x: position.x-Math.cos(angle)*correction, y: position.y-Math.sin(angle)*correction, fixed: true, physics: false});
//         			console.log("Moved " + node.label + " from " + position.x + "," + position.y + " to " + node.x + "," + node.y + " where centre is at " + center.x + "," + center.y);
        		}
        		node.physics = false;       		
        	});
        };
        var edges, nodes, network;
        var x, y, angle, dom_location;
        input_nodes[mutation_number].forEach(function (node) {
        	node.color = 'pink';
        	node.shape = 'box';
        	node.font = input_output_font || '24px arial';
        	node.physics = false;
        });
        output_nodes[mutation_number].forEach(function (node) {
        	node.color = 'orange';
        	node.shape = 'box';
        	node.font = input_output_font || '24px arial';
        	node.physics = false;
        });
        nodes = new vis.DataSet(gene_nodes[mutation_number]);
        edges = new vis.DataSet(links_between_nodes[mutation_number]);
 	    graph_div.className = 'network-graph';
        network = new vis.Network(graph_div, {nodes: nodes, edges: edges}, options);
        network.addEventListener('stabilizationIterationsDone',
							     function () {
										var container_center = network.DOMtoCanvas({x: center_x_dom, y: center_y_dom});
										var scale = network.getScale();
										cell_outline.x = container_center.x;
										cell_outline.y = container_center.y;
										cell_outline.font = Math.round(radius/scale) + 'px arial';
										nodes.add(cell_outline);
										input_nodes[mutation_number].forEach(function (node) {
											// ideally should use bounding box to determine how much to move it the right so it is just outside the circle
											// but length of label is good approximation
											x = center_x_dom+Math.cos(angle)*radius-(node.label.length+1)*5;
											y = center_y_dom+Math.sin(angle)*radius;
											dom_location = network.DOMtoCanvas({x: x, y: y});
											node.x = dom_location.x;
											node.y = dom_location.y;
											angle -= Math.PI/(2*(input_nodes[mutation_number].length-1));
										});
										angle = Math.PI/4; // 45 degrees (north east)
										output_nodes[mutation_number].forEach(function (node) {
											// ideally should use bounding box to determine how much to move it the right so it is just outside the circle
											// but length of label is good approximation
											x = center_x_dom+Math.cos(angle)*radius+(node.label.length+1)*5;
											y = center_y_dom+Math.sin(angle)*radius;
											dom_location = network.DOMtoCanvas({x: x, y: y});
											node.x = dom_location.x;
											node.y = dom_location.y;
											angle -= Math.PI/(2*(output_nodes[mutation_number].length-1));
										});
										nodes.add(input_nodes[mutation_number]);
										nodes.add(output_nodes[mutation_number]);
										update_gene_positions();
										nodes.update(gene_nodes[mutation_number]);
										callback();					
								});
		graph_div.network_information = {mutation_number: mutation_number,
		                                 network:      network,
		                                 gene_nodes:   gene_nodes,
		                                 input_nodes:  input_nodes,
		                                 output_nodes: output_nodes,
		                                 nodes:        nodes,
		                                 edges:        edges};				
        return graph_div;
    };

    var write_page = function () {
        var addParagraph = function (html, id) {
            var p = document.createElement('p');
            p.innerHTML = html;
            if (id) {
                p.id = id;
            }
            document.body.appendChild(p);
        };
        var addDiv = function (id) {
            var div = document.createElement('div');
            div.id = id;
            document.body.appendChild(div);
        };
        var parameters_table = "<table class='parameters-table'><tr><th>Parameter</th><th>Value</th></tr>";
        var i;
        addParagraph("<h1>" + replicates.length + " out of " + number_of_replicates_requested + " results from running microC</h1>");
        addParagraph("Submitted at " + start_time);
        if (typeof parameters !== 'undefined') {
        	addParagraph("See <a href='#parameters'>the general settings</a>.");
        }
        if (typeof mutations_file_contents !== 'undefined') {
			addParagraph("See <a href='#mutations'>the mutation settings</a>.");
	    }
        addParagraph("<h2>Animation of cells</h2>");
        // Dimitris suggested removing the following because it was confusing: Replay time is " + "<span id='canvases-time'>0</span>. 
        addParagraph("To inspect an experimental replicate click on it.", "canvases-caption");
        addDiv('canvases');
        addParagraph("<h2>Averaged simulations results</h2>");
        addDiv('mean-proliferation');
        addDiv('mean-apoptosis');
        addDiv('mean-growth_arrest');
        addDiv('mean-necrosis');
        addParagraph("<h2>All simulation results</h2>");
        addDiv('all-proliferation');
        addDiv('all-apoptosis');
        addDiv('all-growth_arrest');
        addDiv('all-necrosis');
        if (typeof parameters !== 'undefined') {
			addParagraph("<h2>Settings</h2>", 'parameters');
			for (i = 0; i < parameters.length; i += 2) {
				parameters_table += "<tr><td>" + parameters[i] + "</td><td>" + parameters[i+1] + "</td></tr>";
			}
			addParagraph(parameters_table + '</table>');
        }
        if (typeof mutations_file_contents !== 'undefined') {
        	addParagraph("<h2>Mutations</h2>", 'mutations');
        	addParagraph(mutations_file_contents);
        }
    };

    var display_mean = function(id, label, mean_values, standard_deviation_values) {

        var data = [
        {
            y: mean_values,
            error_y: {
                type: 'data',
                array: standard_deviation_values,
                visible: true,
                traceref:1,
                width:0,
                color:"rgba(31, 119, 180, 0.34)",
                thickness:1
                },
                type: 'scatter',
                mode: 'lines',
                line: {shape: 'spline'}
        }];

        var layout = {
            title: label,
            autosize: true
        };

        Plotly.newPlot(id, data, layout, {showLink: true});
    };

    var display_all = function(id, label, all_values) {
        // all_values is an array of arrays

        var data = [];

        all_values.forEach(function(run, index){
            var runNum = index + 1;
            var alphaVal = 1 - 2*index/100
            data.push({
                y: run,
                type: "scatter",
                mode: "lines",
                name: "Run " + runNum,
                line:{
                    shape:"linear",
                    color:"rgba(31, 119, 180," + alphaVal + ")" 
                }
            });
        });

        var layout = {
            title: label,
            showlegend: false,
            hovermode: "closest",
            autosize: true
        };

        Plotly.newPlot(id, data, layout, {showLink: true});
    };

    var display_replicate = function (id, label, proliferation_values, apoptosis_values, growth_arrest_values, necrosis_values) {
        // this will display all four measures on a single graph
        // what would be cool would be if this graph was drawn in sync with the animation -- consider only if easy to do
        // quick fix for now:

        var data = [
            {
                name: "Proliferation Event Count",
                type: "scatter",
                mode: "lines",
                y: proliferation_values
            },
            {
                name: "Apoptosis Rate",
                type: "scatter",
                mode: "lines",
                y: apoptosis_values,
                yaxis:"y2"       
            },
            {
                name: "Growth Arrest Rate",
                type: "scatter",
                mode: "lines",
                y: growth_arrest_values,
                yaxis:"y3"        
            },
            {
                name: "Necrosis Rate",
                type: "scatter",
                mode: "lines",
                y: necrosis_values,
                yaxis:"y4"   
            }
            ];

        var layout = {
            yaxis:{
                type:"linear",
                autorange:true,
                showline:true,
                linecolor:"rgb(31, 119, 180)",
                title: "Proliferation Event Count",
                zeroline: false
            },
            xaxis:{
                type:"linear",
                autorange:true,
                anchor:"free",
                domain:[0,0.8], // Domain allows for additional y-axes to be displayed to the right
                showline:true,
                title:"Time",
                zeroline: false
            },
            yaxis2:{
                overlaying:"y",
                side:"right",
                anchor:"free",
                showline:true,
                linecolor:"rgb(255, 127, 14)",
                position:0.8, // Positions y-axis at edge of the x-axis domain
                rangemode:"normal",
                type:"linear",
                autorange:true,
                ticks:"inside",
            },
            yaxis3:{
                overlaying:"y",
                side:"right",
                anchor:"free",
                position:0.88, // Position to the right of the chart
                showline:true,
                linecolor:"rgb(44, 160, 44)",
                type:"linear",
                autorange:true,
                ticks:"inside",
            },
            yaxis4:{
                overlaying:"y",
                side:"right",
                anchor:"free",
                showline:true,
                linecolor:"rgb(214, 39, 40)",
                position:0.95, // Position to the right of the chart
                ticks:"inside",
                type:"linear",
                autorange:true,
            },
            title: label,
            showlegend: true,
            hovermode: "x"
        };

        Plotly.newPlot(id, data, layout, {showLink: true});
    };

    var context_2D,     // used to draw upon the 2D canvas
        display_cell,   // function to display a cell
        clear_all;      // function to clear all displays

    // initialize when the page has been loaded
    document.addEventListener('DOMContentLoaded', initialize);

 }());
