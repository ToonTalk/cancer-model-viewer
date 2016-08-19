 /**
 * Implements the processing of logs from running the cancer model
 * Authors: Ken Kahn, Martin Hadley, and Rowan Wilson
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

    var gene_font_size = 24;                        // maximum font size if active 100% of the time

    var element_width  = 800;

    var element_height = 500;

    var scene, camera, renderer, 
        statistics_3D, webGL_output;                // for displaying 3D

    var network_graphs = [];

    var canvas_click_listener = function (event, index) {
        var canvas = event.target;
        var replicate_number = canvases.indexOf(event.target);
        var replicate_states_singleton = [replicate_states[replicate_number]];
        var caption_element = document.getElementById('canvases-caption');
        var remove_replicate = function () {
            animation_and_graph_table.parentElement.removeChild(animation_and_graph_table);
            replicate_states_singleton[0] = null; // to stop the animation
        }
        var time_monitor_id = "time-monitor-of-" + replicate_number;
        var animation_and_graph_table = document.createElement('table');
        var animation_row             = document.createElement('tr');
        var graph_row                 = document.createElement('tr');
        var animation_table_header    = document.createElement('td');
        var animation_table_cell      = document.createElement('td');
        var graph_table_cell          = document.createElement('td');
        var close_button              = create_button("Remove inspection of replicate #" + (replicate_number+1),
                                                      remove_replicate);
        var close_button_and_caption  = document.createElement('td');
        var caption = document.createElement('p');
        var graphs = document.createElement('div');
        var add_network_graph = function (gene_graph, table, caption, mutation_number) {
        	var tr1 = document.createElement('tr');
        	var td1 = document.createElement('td');
        	var tr2 = document.createElement('tr');
        	var td2 = document.createElement('td');
        	var caption_h3 = document.createElement('h3');
        	var button_label = "Copy network data to the clipboard";
        	var view_data_click_handler = function (event) {
        		var data = "Replicate\t\Mutation\tTime\tGene\tActivation\tAverage-changes\n";
        		view_data_button.textContent = "Please wait. This can take several seconds.";
        		replicates[replicate_number].a.forEach(function (record, time) {
					if (record[mutation_number]) {
						Object.keys(record[mutation_number]).forEach(function (label) {
							var activation_and_changes = record[mutation_number][label];
							data += replicate_number + '\t' + mutation_number + "\t" + time + '\t' + label + '\t' + activation_and_changes.a + '\t' + activation_and_changes.c + "\n";
						});
					}		
        		});
        		copy_to_clipboard(data, "Data is on the clipboard. Copy it to a spreadsheet.");
        		view_data_button.textContent = button_label;
        		// tried window.prompt("Type Ctrl+C and Enter to copy to the clipboard. Then paste the data into a spreadsheet.", data);
        		// but there is a small size limit
        	};
        	var view_data_button = create_button(button_label,
        	                                     view_data_click_handler,
        	                                     "Click to copy the clipboard the data used in the following network. Suitable for pasting into a spreadsheet for further analysis.");
        	caption_h3.innerHTML = caption;
        	td1.appendChild(caption_h3);
        	caption_h3.appendChild(view_data_button);
        	tr1.appendChild(td1);
        	table.appendChild(tr1);
			td2.appendChild(gene_graph);
			tr2.appendChild(td2);
			table.appendChild(tr2);
        };
        var caption_html = function (color, mutation_number) {
        	var circle = "<div style=';display:inline-block;width:32px;height:32px;border-radius:32px;background-color:" + color + ";'> </div>";
        	var caption;
        	if (mutation_number === 0) {
				caption = "Network for unmutated cells. ";
        	} else {
        		caption = "Network for mutated cells of type " + mutation_number + ". ";
        	}
        	return circle + " " + caption;
        };
        var canvas_td = document.createElement('td');
        var new_canvas, canvases_singleton;
        if (previous_replicate_states_singleton) {
        	// stop the previous animation
        	previous_replicate_states_singleton[0] = null;
        }
        caption.innerHTML = "<tr><td>Animation of replicate #" + (replicate_number+1) + " at time <span id='" + time_monitor_id + "'>0</span>.</td></tr>";
        if (running_3D) {
			canvas_td.appendChild(webGL_output)
        } else {
            new_canvas = document.createElement('canvas');
            canvases_singleton = [new_canvas];
            canvas_td.appendChild(new_canvas);
        }
        close_button_and_caption.appendChild(close_button);
        close_button_and_caption.appendChild(caption);
        animation_row.appendChild(canvas_td);
        animation_and_graph_table.className = 'microc-replicate-inspection';
        animation_and_graph_table.appendChild(close_button_and_caption);
        animation_and_graph_table.appendChild(animation_row);
        if (typeof gene_nodes !== 'undefined') {
        	if (network_graphs.length === 0) {
				// gene_nodes has the gene_nodes of each clone type (i.e. mutation_number)
				gene_nodes.forEach(function (ignore, mutation_number) {
									   var callback = function () {
											              network_graphs[mutation_number] = gene_graph;
													      gene_graph.title = "Redder colours indicate higher average number of state changes of this gene in all occurences of this clone type. Size indicates the fraction active.";
												      };
								       var gene_graph = create_network_graph(callback, mutation_number, element_width, element_height);
									   add_network_graph(gene_graph, animation_and_graph_table, caption_html(default_colors[mutation_number-1], mutation_number-1), mutation_number-1);						
				});
        	} else {
        		// already created network
				network_graphs.forEach(function (gene_graph, index) {
					                       add_network_graph(gene_graph, animation_and_graph_table, caption_html(default_colors[index-1], index-1), index-1);
				});
        	}
        } 
        graph_row.appendChild(graphs);
        animation_and_graph_table.appendChild(graph_row);
        graphs.id = "replicate-#" + replicate_number;
        // perhaps better to set the dimensions using the Plotly API
        graphs.style.width  = element_width  + "px";
        graphs.style.height = element_height + "px";
        caption_element.parentElement.insertBefore(animation_and_graph_table, caption_element);
        // animate this single replicate at a larger size
        animate_cells(replicate_states_singleton, canvases_singleton, expanded_size, 20, false, 2, time_monitor_id);
        display_replicate(graphs.id, 
                          "Cell events for replicate #" + (replicate_number+1),
                          replicate_proliferation_values[replicate_number],
                          replicate_apoptosis_values[replicate_number],
                          replicate_growth_arrest_values[replicate_number],
                          replicate_necrosis_values[replicate_number]);
        previous_replicate_states_singleton = replicate_states_singleton;
    };

    var initialise = function () {
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
            	var change_count_color = function (change_count) {
            		var hue;
//             		if (change_count <= 1) {
//             			// just by chance got the wrong value at the start 
//             			change_count = 0;
//             		}
            		// if has high change count then should be 0 (red while low should be 120 (green)
            		// any change count over 1 per 200 ticks is considered maximum
            		return "hsl(" + (120-Math.min(120, change_count*120*100/tick)) + ",100%,33%)";
//             		// given a number between 0 and 1 computes a color between white (0) and green (1)
//             		// square the fraction to make the differences more apparent 
//             		var shade = (1-fraction*fraction); 	
//             		return "rgba(" + Math.round(fraction*255) + ",127," + Math.round(shade*255) + ",1)";
            	};
            	var activation_font = function (fraction) {
            		// 100% if fraction is 1 and 50% if 0
            		return gene_font_size/(2-fraction) + "px arial white";
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
												   var fraction = current_activation_fractions[index][node_label].a;
												   var change_count = current_activation_fractions[index][node_label].c;
												   var node_with_label = find_node_with_label(node_label, network_information.nodes.get());
												   if (node_with_label) {
												   	   node_with_label.color = change_count_color(change_count);
												   	   node_with_label.font  = activation_font(fraction);
												       node_with_label.title = node_label + " is active in " + Math.round(100*fraction)
												                               + "% of the cells of this clone type. They changed an average " + change_count + " times.";
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
                    renderer.setSize(Math.min(element_width, element_height), Math.min(element_width, element_height));           
//                     renderer.setSize(2*(2+maximum_x-minimum_x)*scale, 2*(2+maximum_y-minimum_y)*scale);
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
                if (log.a) {
                	animate_network(log.a);
                }
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

    var create_network_graph = function (callback, mutation_number, width, height) {
 	    var options = {width:  width+"px",
 	                   height: height+"px",
 	                   edges: {arrows: 'to'},
				       nodes: {color: 'yellow',
 	                           font: gene_font_size + 'px arial white'},
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
        		}
        		node.physics = false;       		
        	});
        };
        var edges, nodes, network;
        var x, y, angle, dom_location;
        input_nodes[mutation_number].forEach(function (node) {
        	node.color = 'pink';
        	node.shape = 'box';
        	node.font = '24px arial';
        	node.physics = false;
        });
        output_nodes[mutation_number].forEach(function (node) {
        	node.color = 'orange';
        	node.shape = 'box';
        	node.font = '24px arial';
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
										var scale_ratio, gene_nodes_of_unmutated_network, positions_of_gene_nodes_of_unmutated_network;
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
										if (mutation_number !== 1) {
											// mutated networks should have the same layout as the original network
											if (scale_ratio === undefined) {
												scale_ratio = network_graphs[1].network_information.network.getScale()/scale;
											}
											gene_nodes_of_unmutated_network = network_graphs[1].network_information.gene_nodes[1];
											positions_of_gene_nodes_of_unmutated_network = network_graphs[1].network_information.network.getPositions(gene_nodes_of_unmutated_network.map(function (node) { return node.id}));
											gene_nodes[mutation_number].forEach(function (node) {
												var position = positions_of_gene_nodes_of_unmutated_network[find_node_with_label(node.label, gene_nodes_of_unmutated_network).id];
												node.x = position.x*scale_ratio;
												node.y = position.y*scale_ratio;
											});
											nodes.update(gene_nodes[mutation_number]);
										} else {
											nodes.update(gene_nodes[mutation_number]);
										}
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
        var add_paragraph = function (html, id) {
            var p = document.createElement('p');
            p.innerHTML = html;
            if (id) {
                p.id = id;
            }
            document.body.appendChild(p);
        };
        var add_div = function (id) {
            var div = document.createElement('div');
            div.id = id;
            document.body.appendChild(div);
        };
        var parameters_table = "<table class='parameters-table'><tr><th>Parameter</th><th>Value</th></tr>";
        var link_text, i;
        add_paragraph("<h1>" + replicates.length + " out of " + number_of_replicates_requested + " results from running microC</h1>");
        add_paragraph("Submitted at " + start_time);
        if (typeof parameters !== 'undefined') {
        	link_text = "See <a href='#parameters'>the general settings</a>.";
        }
        if (typeof mutations_file_contents !== 'undefined') {
			link_text += " See <a href='#mutations'>the mutation settings</a>.";
	    }
	    if (typeof associations_file_contents !== 'undefined') {
	    	link_text += " See <a href='#other-settings'>other settings</a>.";
	    }
	    if (link_text) {
	    	add_paragraph(link_text);
	    }
        add_paragraph("<h2>Animation of cells</h2>");
        // Dimitris suggested removing the following because it was confusing: Replay time is " + "<span id='canvases-time'>0</span>. 
        add_paragraph("To inspect an experimental replicate click on it.", "canvases-caption");
        add_div('canvases');
        add_paragraph("<h2>Averaged simulations results</h2>");
        add_div('mean-proliferation');
        add_div('mean-apoptosis');
        add_div('mean-growth_arrest');
        add_div('mean-necrosis');
        add_paragraph("<h2>All simulation results</h2>");
        add_div('all-proliferation');
        add_div('all-apoptosis');
        add_div('all-growth_arrest');
        add_div('all-necrosis');
        if (typeof parameters !== 'undefined') {
			add_paragraph("<h2>Settings</h2>", 'parameters');
			for (i = 0; i < parameters.length; i += 2) {
				parameters_table += "<tr><td>" + parameters[i] + "</td><td>" + parameters[i+1] + "</td></tr>";
			}
			add_paragraph(parameters_table + '</table>');
        }
        if (typeof mutations_file_contents !== 'undefined') {
        	add_paragraph("<h2>Mutations</h2>", 'mutations');
        	add_paragraph(mutations_file_contents);
        }
        if (typeof associations_file_contents !== 'undefined') {
        	add_paragraph("<h2>Associations</h2>", 'other-settings');
        	add_paragraph(associations_file_contents);
        }
        if (typeof diffusion_file_contents !== 'undefined') {
        	add_paragraph("<h2>Diffusion parameters</h2>");
        	add_paragraph(diffusion_file_contents);
        }
        if (typeof input_parameters_file_contents !== 'undefined') {
        	add_paragraph("<h2>Input parameters</h2>");
        	add_paragraph(input_parameters_file_contents);
        }
        if (typeof regulatory_graph_file_contents !== 'undefined') {
        	document.body.appendChild(create_button("Copy regulatory graph to clipboard.",
        	                                        function (event) {
        	                                        	copy_to_clipboard(regulatory_graph_file_contents.replace("<br>", "\n"),
        	                                        	                  "Paste the contents of the clipboard into a file named regulatoryGraph.html.");
        	                                        }));
        }
    };

    var find_node_with_label = function (node_label, nodes) {
    	var node_with_label;
		nodes.some(function (node) {
					   if (node.label === node_label) {
						   node_with_label = node;
						   return true;
					   }
		           });
		return node_with_label;
    };

    var copy_to_clipboard = function (text, success_message) {
    	  // based on http://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
		  var textArea = document.createElement("textarea");
		  //
		  // *** This styling is an extra step which is likely not required. ***
		  //
		  // Why is it here? To ensure:
		  // 1. the element is able to have focus and selection.
		  // 2. if element was to flash render it has minimal visual impact.
		  // 3. less flakyness with selection and copying which **might** occur if
		  //    the textarea element is not visible.
		  //
		  // The likelihood is the element won't even render, not even a flash,
		  // so some of these are just precautions. However in IE the element
		  // is visible whilst the popup box asking the user for permission for
		  // the web page to copy to the clipboard.
		  //
		  // Place in top-left corner of screen regardless of scroll position.
		  textArea.style.position = 'fixed';
		  textArea.style.top = 0;
		  textArea.style.left = 0;
		  // Ensure it has a small width and height. Setting to 1px / 1em
		  // doesn't work as this gives a negative w/h on some browsers.
		  textArea.style.width = '2em';
		  textArea.style.height = '2em';
		  // We don't need padding, reducing the size if it does flash render.
		  textArea.style.padding = 0;
		  // Clean up any borders.
		  textArea.style.border = 'none';
		  textArea.style.outline = 'none';
		  textArea.style.boxShadow = 'none';
		  // Avoid flash of white box if rendered for any reason.
		  textArea.style.background = 'transparent';
		  textArea.value = text;
		  document.body.appendChild(textArea);
		  textArea.select();
		  try {
			if (document.execCommand('copy')) {
				alert(success_message)
			} else {
				alert("This browser failed to put the data on clipboard. Data in next alert.");
			    alert(text);
			}
		  } catch (error) {
			alert("This browser raised an error putting data on clipboard." + error + " Data in next alert.");
			alert(text);
		  }
		  document.body.removeChild(textArea);
	};

	var create_button = function (label, click_listener, title) {
		var button = document.createElement('button');
		button.textContent = label;
        button.className = 'microc-button';
        if (title) {
        	button.title = title;
        }
        if (click_listener) {
        	button.addEventListener('click', click_listener);
        }
        return button;
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

    // initialise when the page has been loaded
    document.addEventListener('DOMContentLoaded', initialise);

 }());
