import threading
import time
from smartcard.System import readers
from smartcard.util import toHexString
from smartcard.Exceptions import NoReadersException, CardConnectionException

class NFCReader(threading.Thread):
    def __init__(self, on_scan_callback):
        super().__init__()
        self.on_scan_callback = on_scan_callback
        self._stop_event = threading.Event()
        self.daemon = True
        self.last_uid = None
        self.last_scan_time = 0
        self.debounce_seconds = 2.0

    def stop(self):
        self._stop_event.set()

    def run(self):
        print("NFC Reader thread started (Silent mode active)...")
        
        while not self._stop_event.is_set():
            try:
                r = readers()
                if not r:
                    # No readers found, wait longer and retry quietly
                    time.sleep(2)
                    continue

                reader = r[0]
                connection = reader.createConnection()
                try:
                    connection.connect()
                    
                    # GET_UID APDU: CLA=0xFF, INS=0xCA, P1=0x00, P2=0x00, Le=0x00
                    GET_UID = [0xFF, 0xCA, 0x00, 0x00, 0x00]
                    data, sw1, sw2 = connection.transmit(GET_UID)
                    
                    current_time = time.time()
                    uid = None
                    
                    if sw1 == 0x90 and sw2 == 0x00:
                        uid = toHexString(data)
                    else:
                        # Card detected but UID not readable via standard APDU
                        uid = "GENERIC_CARD"

                    # Debounce and new card detection logic
                    if uid != self.last_uid or (current_time - self.last_scan_time > self.debounce_seconds):
                        print(f"NFC Scan detected: {uid}")
                        self.on_scan_callback(uid)
                        self.last_uid = uid
                        self.last_scan_time = current_time
                        
                except CardConnectionException:
                    # This is normal when no card is present or card is removed
                    self.last_uid = None
                    pass
                except Exception:
                    # Silence other communication errors to avoid console spam
                    self.last_uid = None
                    pass
                
            except NoReadersException:
                pass
            except Exception as e:
                # Only log critical system errors once
                print(f"NFC System Error: {e}")
                time.sleep(5)
            
            time.sleep(0.5)
