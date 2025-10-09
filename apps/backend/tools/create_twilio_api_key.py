#!/usr/bin/env python3
"""Create a Twilio API Key for your account.

Usage:
  TW_ACCOUNT_SID=AC... TW_AUTH_TOKEN=... python create_twilio_api_key.py --friendly dev-key

The script prints the JSON response (including the secret). The secret is shown only once by Twilio; store it securely.

Optional arguments:
  --friendly  Friendly name for the key
  --out-file  Write shell export lines to this file (appends). Useful to capture TW_API_KEY_SID/TW_API_KEY_SECRET.

It requires TW_ACCOUNT_SID and TW_AUTH_TOKEN environment variables (or you can pass them with flags).
"""
from __future__ import annotations
import os
import sys
import argparse
import requests
from datetime import datetime
import json
from dotenv import load_dotenv

# Load env vars from .env for local development
load_dotenv()


def create_key(account_sid: str, auth_token: str, friendly_name: str = None):
	url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Keys.json"
	if not friendly_name:
		friendly_name = f"cli-key-{int(datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi')).timestamp())}"
	payload = {'FriendlyName': friendly_name}
	resp = requests.post(url, auth=(account_sid, auth_token), data=payload)
	resp.raise_for_status()
	return resp.json()


def write_env_lines(out_file: str, key_sid: str, key_secret: str):
	line1 = f"TW_API_KEY_SID={key_sid}\n"
	line2 = f"TW_API_KEY_SECRET={key_secret}\n"
	with open(out_file, 'a', encoding='utf-8') as f:
		f.write(f"# Added by create_twilio_api_key.py on {datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi')).isoformat()}\n")
		f.write(line1)
		f.write(line2)


def main(argv=None):
	parser = argparse.ArgumentParser()
	parser.add_argument('--account-sid', help='Twilio Account SID (AC...)')
	parser.add_argument('--auth-token', help='Twilio Auth Token')
	parser.add_argument('--friendly', help='Friendly name for the API key')
	parser.add_argument('--out-file', help='Optional file to append export lines to (e.g., .env)')
	args = parser.parse_args(argv)

	account_sid = args.account_sid or os.environ.get('TW_ACCOUNT_SID') or os.environ.get('ACCOUNT_SID')
	auth_token = args.auth_token or os.environ.get('TW_AUTH_TOKEN') or os.environ.get('AUTH_TOKEN')

	if not account_sid or not auth_token:
		print('ERROR: TW_ACCOUNT_SID and TW_AUTH_TOKEN are required (env or --account-sid/--auth-token)')
		parser.print_help()
		sys.exit(2)

	try:
		resp = create_key(account_sid, auth_token, args.friendly)
	except requests.HTTPError as he:
		print('HTTP error creating key:', he)
		try:
			print(he.response.text)
		except Exception:
			pass
		sys.exit(1)

	# Twilio responds with a structure containing 'sid' and 'secret'
	print(json.dumps(resp, indent=2))

	key_sid = resp.get('sid')
	key_secret = resp.get('secret')
	if key_sid and key_secret:
		print('\nIMPORTANT: copy the secret now. Twilio will not show it again.')
		if args.out_file:
			write_env_lines(args.out_file, key_sid, key_secret)
			print(f'Wrote env lines to {args.out_file}')
	else:
		print('Warning: response did not include sid/secret; see output above')


if __name__ == '__main__':
	main()

