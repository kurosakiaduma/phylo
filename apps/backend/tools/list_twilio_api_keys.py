#!/usr/bin/env python3
"""List Twilio API Keys for an account.

Usage:
  TW_ACCOUNT_SID=AC... TW_AUTH_TOKEN=... python list_twilio_api_keys.py
"""
import os
import sys
import argparse
import requests
import json
from dotenv import load_dotenv

load_dotenv()


def list_keys(account_sid: str, auth_token: str):
    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Keys.json"
    resp = requests.get(url, auth=(account_sid, auth_token))
    resp.raise_for_status()
    return resp.json()


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--account-sid')
    parser.add_argument('--auth-token')
    args = parser.parse_args(argv)

    account_sid = args.account_sid or os.environ.get('TW_ACCOUNT_SID')
    auth_token = args.auth_token or os.environ.get('TW_AUTH_TOKEN')
    if not account_sid or not auth_token:
        print('TW_ACCOUNT_SID and TW_AUTH_TOKEN required')
        sys.exit(2)

    resp = list_keys(account_sid, auth_token)
    print(json.dumps(resp, indent=2))


if __name__ == '__main__':
    main()
