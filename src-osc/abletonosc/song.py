import os
import sys
import tempfile
import Live
import json
from functools import partial
from typing import Tuple, Any

from .handler import AbletonOSCHandler

class SongHandler(AbletonOSCHandler):
    def __init__(self, manager):
        super().__init__(manager)
        self.class_identifier = "song"

    def init_api(self):
        #--------------------------------------------------------------------------------
        # Callbacks for Song: methods
        #--------------------------------------------------------------------------------
        for method in [
            "capture_and_insert_scene",
            "capture_midi",
            "continue_playing",
            "create_audio_track",
            "create_midi_track",
            "create_return_track",
            "create_scene",
            "delete_return_track",
            "delete_scene",
            "delete_track",
            "duplicate_scene",
            "duplicate_track",
            "force_link_beat_time",
            "jump_by",
            "jump_to_prev_cue",
            "jump_to_next_cue",
            "redo",
            "re_enable_automation",
            "set_or_delete_cue",
            "start_playing",
            "stop_all_clips",
            "stop_playing",
            "tap_tempo",
            "trigger_session_record",
            "undo"
        ]:
            callback = partial(self._call_method, self.song, method)
            self.osc_server.add_handler("/live/song/%s" % method, callback)

        #--------------------------------------------------------------------------------
        # Callbacks for Song: properties (read/write)
        #--------------------------------------------------------------------------------
        properties_rw = [
            "arrangement_overdub",
            "back_to_arranger",
            "clip_trigger_quantization",
            "current_song_time",
            "groove_amount",
            "is_ableton_link_enabled",
            "loop",
            "loop_length",
            "loop_start",
            "metronome",
            "midi_recording_quantization",
            "nudge_down",
            "nudge_up",
            "punch_in",
            "punch_out",
            "record_mode",
            "root_note",
            "scale_name",
            "session_record",
            "signature_denominator",
            "signature_numerator",
            "tempo",
            "start_time"
        ]

        #--------------------------------------------------------------------------------
        # Callbacks for Song: properties (read-only)
        #--------------------------------------------------------------------------------
        properties_r = [
            "can_redo",
            "can_undo",
            "is_playing",
            "song_length",
            "session_record_status"
        ]

        for prop in properties_r + properties_rw:
            self.osc_server.add_handler("/live/song/get/%s" % prop, partial(self._get_property, self.song, prop))
            self.osc_server.add_handler("/live/song/start_listen/%s" % prop, partial(self._start_listen, self.song, prop))
            self.osc_server.add_handler("/live/song/stop_listen/%s" % prop, partial(self._stop_listen, self.song, prop))
        for prop in properties_rw:
            self.osc_server.add_handler("/live/song/set/%s" % prop, partial(self._set_property, self.song, prop))

        #--------------------------------------------------------------------------------
        # Callbacks for Song: Track properties
        #--------------------------------------------------------------------------------
        self.osc_server.add_handler("/live/song/get/num_tracks", lambda _: (len(self.song.tracks),))

        def song_get_track_names(params):
            if len(params) == 0:
                track_index_min, track_index_max = 0, len(self.song.tracks)
            else:
                track_index_min, track_index_max = params
                if track_index_max == -1:
                    track_index_max = len(self.song.tracks)
            return tuple(self.song.tracks[index].name for index in range(track_index_min, track_index_max))
        self.osc_server.add_handler("/live/song/get/track_names", song_get_track_names)

        def song_get_track_data(params):
            """
            Retrieve one more properties of a block of tracks and their clips.
            Properties must be of the format track.property_name or clip.property_name.

            For example:
                /live/song/get/track_data 0 12 track.name clip.name clip.length

            Queries tracks 0..11, and returns a list of values comprising:

            [track_0_name, clip_0_0_name,   clip_0_1_name,   ... clip_0_7_name,
                           clip_1_0_length, clip_0_1_length, ... clip_0_7_length,
             track_1_name, clip_1_0_name,   clip_1_1_name,   ... clip_1_7_name, ...]
            """
            track_index_min, track_index_max, *properties = params
            track_index_min = int(track_index_min)
            track_index_max = int(track_index_max)
            self.logger.info("Getting track data: %s (tracks %d..%d)" %
                             (properties, track_index_min, track_index_max))
            if track_index_max == -1:
                track_index_max = len(self.song.tracks)
            rv = []
            for track_index in range(track_index_min, track_index_max):
                track = self.song.tracks[track_index]
                for prop in properties:
                    obj, property_name = prop.split(".")
                    if obj == "track":
                        if property_name == "num_devices":
                            value = len(track.devices)
                        else:
                            value = getattr(track, property_name)
                            if isinstance(value, Live.Track.Track):
                                #--------------------------------------------------------------------------------
                                # Map Track objects to their track_index to return via OSC
                                #--------------------------------------------------------------------------------
                                value = list(self.song.tracks).index(value)
                        rv.append(value)
                    elif obj == "clip":
                        for clip_slot in track.clip_slots:
                            if clip_slot.clip is not None:
                                rv.append(getattr(clip_slot.clip, property_name))
                            else:
                                rv.append(None)
                    elif obj == "clip_slot":
                        for clip_slot in track.clip_slots:
                            rv.append(getattr(clip_slot, property_name))
                    elif obj == "device":
                        for device in track.devices:
                            rv.append(getattr(device, property_name))
                    else:
                        self.logger.error("Unknown object identifier in get/track_data: %s" % obj)
            return tuple(rv)
        self.osc_server.add_handler("/live/song/get/track_data", song_get_track_data)


        def song_export_structure(params):
            tracks = []
            for track_index, track in enumerate(self.song.tracks):
                group_track = None
                if track.group_track is not None:
                    group_track = list(self.song.tracks).index(track.group_track)
                track_data = {
                    "index": track_index,
                    "name": track.name,
                    "is_foldable": track.is_foldable,
                    "group_track": group_track,
                    "clips": [],
                    "devices": []
                }
                for clip_index, clip_slot in enumerate(track.clip_slots):
                    if clip_slot.clip:
                        clip_data = {
                            "index": clip_index,
                            "name": clip_slot.clip.name,
                            "length": clip_slot.clip.length,
                        }
                        track_data["clips"].append(clip_data)

                for device_index, device in enumerate(track.devices):
                    device_data = {
                        "class_name": device.class_name,
                        "type": device.type,
                        "name": device.name,
                        "parameters": []
                    }
                    for parameter in device.parameters:
                        device_data["parameters"].append({
                            "name": parameter.name,
                            "value": parameter.value,
                            "min": parameter.min,
                            "max": parameter.max,
                            "is_quantized": parameter.is_quantized,
                        })
                    track_data["devices"].append(device_data)

                tracks.append(track_data)
            song = {
                "tracks": tracks
            }

            if sys.platform == "darwin":
                #--------------------------------------------------------------------------------
                # On macOS, TMPDIR by default points to a process-specific directory.
                # We want to use a global temp dir (typically, tmp) so that other processes
                # know where to find this output .json, so unset TMPDIR.
                #--------------------------------------------------------------------------------
                os.environ["TMPDIR"] = ""
            fd = open(os.path.join(tempfile.gettempdir(), "abletonosc-song-structure.json"), "w")
            json.dump(song, fd)
            fd.close()
            self.logger.warning("Exported song structure to directory %s" % tempfile.gettempdir())
            return (1,)
        self.osc_server.add_handler("/live/song/export/structure", song_export_structure)

        #--------------------------------------------------------------------------------
        # Callbacks for Song: Scene properties
        #--------------------------------------------------------------------------------
        self.osc_server.add_handler("/live/song/get/num_scenes", lambda _: (len(self.song.scenes),))

        def song_get_scene_names(params):
            if len(params) == 0:
                scene_index_min, scene_index_max = 0, len(self.song.scenes)
            else:
                scene_index_min, scene_index_max = params
            return tuple(self.song.scenes[index].name for index in range(scene_index_min, scene_index_max))
        self.osc_server.add_handler("/live/song/get/scenes/name", song_get_scene_names)

        #--------------------------------------------------------------------------------
        # Callbacks for Song: Cue point properties
        #--------------------------------------------------------------------------------
        def song_get_cue_points(song, _):
            cue_points = song.cue_points
            cue_point_pairs = [(cue_point.name, cue_point.time) for cue_point in cue_points]
            return tuple(element for pair in cue_point_pairs for element in pair)
        self.osc_server.add_handler("/live/song/get/cue_points", partial(song_get_cue_points, self.song))

        def song_jump_to_cue_point(song, params: Tuple[Any] = ()):
            cue_point_index = params[0]
            if isinstance(cue_point_index, str):
                for cue_point in song.cue_points:
                    if cue_point.name == cue_point_index:
                        cue_point.jump()
            elif isinstance(cue_point_index, int):
                cue_point = song.cue_points[cue_point_index]
                cue_point.jump()
        self.osc_server.add_handler("/live/song/cue_point/jump", partial(song_jump_to_cue_point, self.song))

        self.osc_server.add_handler("/live/song/cue_point/add_or_delete", partial(self._call_method, self.song, "set_or_delete_cue"))
        def song_cue_point_set_name(song, params: Tuple[Any] = ()):
            cue_point_index = params[0]
            new_name = params[1]
            cue_point = song.cue_points[cue_point_index]
            cue_point.name = new_name
        self.osc_server.add_handler("/live/song/cue_point/set/name", partial(song_cue_point_set_name, self.song))

        # --------------------------------------------------------------------------------
        # Get File Path
        # --------------------------------------------------------------------------------

        def song_get_file_path(params):
            """
            Returns full path of current .als file
            """
            try:
                path = self.song.file_path
                return (path,) if path else ("",)
            except Exception as e:
                self.logger.error("Error in song_get_file_path: %s" % str(e))
                return ("",)

        self.osc_server.add_handler("/live/song/get/file_path", song_get_file_path)

        # --------------------------------------------------------------------------------
        # Listener for /live/song/start_listen/cue_points
        # --------------------------------------------------------------------------------
        self.registered_cue_listeners = []

        def clear_individual_cue_listeners():
            # Clean up old listeners to prevent duplicates and memory leaks
            for cue in self.registered_cue_listeners:
                try:
                    if cue.name_has_listener(self.cue_points_changed):
                        cue.remove_name_listener(self.cue_points_changed)
                    if cue.time_has_listener(self.cue_points_changed):
                        cue.remove_time_listener(self.cue_points_changed)
                except:
                    pass
            self.registered_cue_listeners.clear()

        def stop_cue_points_listener(params: Tuple[Any] = ()):
            try:
                self.song.remove_cue_points_listener(self.main_cue_array_changed)
                self.logger.info("Removing main cue points listener")
            except:
                pass
            clear_individual_cue_listeners()

        def start_cue_points_listener(params: Tuple[Any] = ()):
            stop_cue_points_listener()
            self.logger.info("Adding main cue points listener")
            self.song.add_cue_points_listener(self.main_cue_array_changed)
            # Bind to whatever cues exist right now on startup
            self.main_cue_array_changed()

        self.main_clear_individual_cues = clear_individual_cue_listeners
        self.osc_server.add_handler("/live/song/start_listen/cue_points", start_cue_points_listener)
        self.osc_server.add_handler("/live/song/stop_listen/cue_points", stop_cue_points_listener)

        # --------------------------------------------------------------------------------
        # Complete Structural and Attribute Listener for Scenes Data
        # --------------------------------------------------------------------------------
        self.registered_scene_objects = []
        self.registered_track_name_objects = []

        def clear_individual_scene_listeners():
            """Safely drops property hooks on individual scene items."""
            for scene in self.registered_scene_objects:
                try:
                    if scene.name_has_listener(self.scenes_combined_data_changed):
                        scene.remove_name_listener(self.scenes_combined_data_changed)
                    if scene.tempo_has_listener(self.scenes_combined_data_changed):
                        scene.remove_tempo_listener(self.scenes_combined_data_changed)

                    # Time signatures are tricky across versions; catch errors gracefully
                    if hasattr(scene, 'signature_numerator_has_listener'):
                        if scene.signature_numerator_has_listener(self.scenes_combined_data_changed):
                            scene.remove_signature_numerator_listener(self.scenes_combined_data_changed)
                        if scene.signature_denominator_has_listener(self.scenes_combined_data_changed):
                            scene.remove_signature_denominator_listener(self.scenes_combined_data_changed)
                except:
                    pass
            self.registered_scene_objects.clear()

        def stop_scenes_combined_listener(params: Tuple[Any] = ()):
            try:
                self.song.remove_scenes_listener(self.main_scene_array_changed)
                self.logger.info("Removing main scenes framework listener.")
            except:
                pass
            clear_individual_scene_listeners()

        def start_scenes_combined_listener(params: Tuple[Any] = ()):
            stop_scenes_combined_listener()
            self.logger.info("Adding main scenes framework listener.")
            self.song.add_scenes_listener(self.main_scene_array_changed)
            # Bootstraps the system right away on connection
            self.main_scene_array_changed()


        self.main_clear_individual_scenes = clear_individual_scene_listeners
        self.osc_server.add_handler("/live/song/start_listen/scenes", start_scenes_combined_listener)
        self.osc_server.add_handler("/live/song/stop_listen/scenes", stop_scenes_combined_listener)


        def clear_individual_track_name_listeners():
            """Safely drops name listeners on individual track objects."""
            for track in self.registered_track_name_objects:
                try:
                    if track.name_has_listener(self.track_names_changed):
                        track.remove_name_listener(self.track_names_changed)
                except:
                    pass
            self.registered_track_name_objects.clear()

        def stop_track_names_listener(params: Tuple[Any] = ()):
            try:
                self.song.remove_tracks_listener(self.main_track_array_changed)
                self.logger.info("Removing main track names listener.")
            except:
                pass
            clear_individual_track_name_listeners()

        def start_track_names_listener(params: Tuple[Any] = ()):
            stop_track_names_listener()
            self.logger.info("Adding main track names listener.")
            self.song.add_tracks_listener(self.main_track_array_changed)
            # Bootstrap: bind to whatever tracks exist right now, and send initial state
            self.main_track_array_changed()

        self.main_clear_individual_track_names = clear_individual_track_name_listeners
        self.osc_server.add_handler("/live/song/start_listen/track_names", start_track_names_listener)
        self.osc_server.add_handler("/live/song/stop_listen/track_names", stop_track_names_listener)

        #--------------------------------------------------------------------------------
        # Listener for /live/song/get/beat
        #--------------------------------------------------------------------------------
        self.last_song_time = -1.0
        
        def stop_beat_listener(params: Tuple[Any] = ()):
            try:
                self.song.remove_current_song_time_listener(self.current_song_time_changed)
                self.logger.info("Removing beat listener")
            except:
                pass

        def start_beat_listener(params: Tuple[Any] = ()):
            stop_beat_listener()
            self.logger.info("Adding beat listener")
            self.song.add_current_song_time_listener(self.current_song_time_changed)

        self.osc_server.add_handler("/live/song/start_listen/beat", start_beat_listener)
        self.osc_server.add_handler("/live/song/stop_listen/beat", stop_beat_listener)

    def main_track_array_changed(self):
        """Fires when a track is created, deleted, or reordered. Re-binds name listeners."""
        self.logger.info("Track allocation changed. Re-binding name listeners.")

        # 1. Clear old per-track listeners
        self.main_clear_individual_track_names()

        # 2. Attach a name listener to every current track
        for track in self.song.tracks:
            try:
                track.add_name_listener(self.track_names_changed)
                self.registered_track_name_objects.append(track)
            except Exception as e:
                self.logger.error(f"Failed to attach name listener to track: {e}")

        # 3. Immediately broadcast current state
        self.track_names_changed()

    def track_names_changed(self):
        """Fires whenever a track is added/removed/reordered, or any track is renamed."""
        self.logger.info("Track names changed, broadcasting update...")
        names = tuple(track.name for track in self.song.tracks)
        self.osc_server.send("/live/song/get/track_names", names)

    def current_song_time_changed(self):
        #--------------------------------------------------------------------------------
        # If song has rewound or skipped to next beat, sent a /live/beat message
        #--------------------------------------------------------------------------------
        if (self.song.current_song_time < self.last_song_time) or \
                (int(self.song.current_song_time) > int(self.last_song_time)):
            self.osc_server.send("/live/song/get/beat", (int(self.song.current_song_time),))
        self.last_song_time = self.song.current_song_time

    def main_scene_array_changed(self):
        """Fires when a row is created, deleted, or reordered. Re-binds sub-listeners."""
        self.logger.info("Scenes row allocation changed. Re-binding item-level listeners.")

        # 1. Clear memory loops out
        self.main_clear_individual_scenes()

        # 2. Attach property monitoring hooks to every existing scene row
        for scene in self.song.scenes:
            try:
                scene.add_name_listener(self.scenes_combined_data_changed)
                scene.add_tempo_listener(self.scenes_combined_data_changed)

                # Attach time signature updates securely depending on version compatibility
                if hasattr(scene, 'add_signature_numerator_listener'):
                    scene.add_signature_numerator_listener(self.scenes_combined_data_changed)
                    scene.add_signature_denominator_listener(self.scenes_combined_data_changed)

                self.registered_scene_objects.append(scene)
            except Exception as e:
                self.logger.error(f"Failed to append dynamic scene attribute listener: {e}")

        # 3. Immediately broadcast the master state representation out
        self.scenes_combined_data_changed()

    def scenes_combined_data_changed(self):
        """Fires whenever a structural row change, rename, tempo shift, or signature edit occurs."""
        self.logger.info("Scene property modification detected. Packing structural payload...")

        flat_payload = []
        for scene in self.song.scenes:
            name = scene.name if scene.name else ""

            tempo = 120.0
            try:
                if hasattr(scene, 'tempo_controlled') and scene.tempo_controlled:
                    tempo = scene.tempo
                elif hasattr(scene, 'tempo') and scene.tempo > 0:
                    tempo = scene.tempo
            except:
                pass

            sig_num = 4
            sig_den = 4
            try:
                if hasattr(scene, 'signature_controlled') and scene.signature_controlled:
                    sig_num = scene.signature_numerator
                    sig_den = scene.signature_denominator
                elif hasattr(scene, 'signature_numerator'):
                    sig_num = scene.signature_numerator
                    sig_den = scene.signature_denominator
            except:
                pass

            flat_payload.append(name)
            flat_payload.append(float(tempo))
            flat_payload.append(int(sig_num))
            flat_payload.append(int(sig_den))

        self.osc_server.send("/live/song/get/scenes", tuple(flat_payload))
        
    def main_cue_array_changed(self):
        """Fires when a cue is added or deleted. Re-binds property listeners to the new list."""
        self.logger.info("Cue list array structure changed. Re-binding property listeners.")

        # 1. Clear existing listeners on old cue objects
        self.main_clear_individual_cues()

        # 2. Bind fresh name and time listeners to every current cue point
        for cue in self.song.cue_points:
            try:
                cue.add_name_listener(self.cue_points_changed)
                cue.add_time_listener(self.cue_points_changed)
                self.registered_cue_listeners.append(cue)
            except Exception as e:
                self.logger.error(f"Failed to bind listener to cue point: {e}")

        # 3. Immediately broadcast the current state
        self.cue_points_changed()

    def cue_points_changed(self):
        """Fires whenever the array structure, a name, or a position changes."""
        self.logger.info("Cue point attribute changed, broadcasting update...")
        cue_points = self.song.cue_points
        cue_point_pairs = [(cue_point.name, cue_point.time) for cue_point in cue_points]
        flat_tuple = tuple(element for pair in cue_point_pairs for element in pair)

        # Broadcast the updated list directly to your listener
        self.osc_server.send("/live/song/get/cue_points", flat_tuple)

    def clear_api(self):
        super().clear_api()
        try:
            self.song.remove_current_song_time_listener(self.current_song_time_changed)
        except:
            pass

        try:
            self.song.remove_cue_points_listener(self.main_cue_array_changed)
            self.main_clear_individual_cues()
        except:
            pass

        try:
            self.song.remove_scenes_listener(self.scenes_combined_data_changed)
        except:
            pass

        try:
            self.song.remove_tracks_listener(self.main_track_array_changed)
            self.main_clear_individual_track_names()
        except:
            pass
