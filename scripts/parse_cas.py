import sys
import json
import argparse
from casparser import read_cas_pdf
from datetime import date, datetime

class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, (date, datetime)):
            return o.isoformat()
        return super().default(o)

def main():
    parser = argparse.ArgumentParser(description='Parse CAS PDF')
    parser.add_argument('filepath', help='Path to the PDF file')
    parser.add_argument('--password', help='Password for the PDF', default='')
    
    args = parser.parse_args()
    
    try:
        data = read_cas_pdf(args.filepath, args.password)
        print(json.dumps(data, cls=DateTimeEncoder))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
