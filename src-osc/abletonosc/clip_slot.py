from typing import Tuple, Any
from .handler import AbletonOSCHandler
import Live

class ClipSlotHandler(AbletonOSCHandler):
    def __init__(self, manager):
        super().__init__(manager)
        self.class_identifier = "clip_slot"

    def init_api(self):
        def create_clip_slot_callback(func, *args, pass_clip_index=False):
            def clip_slot_callback(params: Tuple[Any]):
                track_index, clip_index = int(params[0]), int(params[1])
                track = self.song.tracks[track_index]
                clip_slot = track.clip_slots[clip_index]

                if pass_clip_index:
                    rv = func(clip_slot, *args, tuple(params[0:]))
                else:
                    rv = func(clip_slot, *args, tuple(params[2:]))

                self.logger.info(track_index, clip_index, rv)
                if rv is not None:
                    return (track_index, clip_index, *rv)

            return clip_slot_callback

        methods = [
            "fire",
            "stop",
            "create_clip",
            "delete_clip"
        ]
        properties_r = [
            "has_clip",
            "controls_other_clips",
            "is_group_slot",
            "is_playing",
            "is_triggered",
            "playing_status",
            "will_record_on_start",
        ]
        properties_rw = [
            "has_stop_button"
        ]

        for method in methods:
            self.osc_server.add_handler("/live/clip_slot/%s" % method,
                                        create_clip_slot_callback(self._call_method, method))

        for prop in properties_r + properties_rw:
            self.osc_server.add_handler("/live/clip_slot/get/%s" % prop,
                                        create_clip_slot_callback(self._get_property, prop))
            self.osc_server.add_handler("/live/clip_slot/start_listen/%s" % prop,
                                        create_clip_slot_callback(self._start_listen, prop, pass_clip_index=True))
            self.osc_server.add_handler("/live/clip_slot/stop_listen/%s" % prop,
                                        create_clip_slot_callback(self._stop_listen, prop, pass_clip_index=True))
        for prop in properties_rw:
            self.osc_server.add_handler("/live/clip_slot/set/%s" % prop,
                                        create_clip_slot_callback(self._set_property, prop))

        def duplicate_clip_slot(clip_slot, args):
            target_track_index, target_clip_index = tuple(args)
            track = self.song.tracks[target_track_index]
            target_clip_slot = track.clip_slots[target_clip_index]
            clip_slot.duplicate_clip_to(target_clip_slot)

        self.osc_server.add_handler("/live/clip_slot/duplicate_clip_to", create_clip_slot_callback(duplicate_clip_slot))

        def find_browser_item_by_name(filename, roots=None):
            if roots is None:
                app = Live.Application.get_application()
                roots = list(app.browser.user_folders) + [app.browser.user_library]

            def walk(item):
                if not item.is_folder and item.name == filename:
                    return item
                if item.is_folder:
                    for child in item.children:
                        found = walk(child)
                        if found:
                            return found
                return None

            for root in roots:
                found = walk(root)
                if found:
                    return found
            return None

        def load_sample(clip_slot, args):
            self.logger.info(f"Trying to load sample to {clip_slot}, args: {args}")
            file_name = args[0]  # e.g. "kick.wav" — must match the name shown in Live's browser
            item = find_browser_item_by_name(file_name)
            if item is None:
                self.logger.warning("Could not find browser item for %s" % file_name)
                return None
            self.song.view.highlighted_clip_slot = clip_slot
            Live.Application.get_application().browser.load_item(item)
            return None

        self.osc_server.add_handler("/live/clip_slot/load_sample", create_clip_slot_callback(load_sample))
