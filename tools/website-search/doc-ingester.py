#!/usr/bin/env python3

'''
- create an index with mapping

    #mappings and analyzer settings
    PUT docs/
    {
      "mappings": {
        "properties": {
          "url" : { "type": "text" },
          "content" : {
            "type": "text",
            "analyzer": "html_analyzer",
            "search_analyzer": "standard"
          },
          "version" : { "type": "keyword" },
          "summary" : {
            "type": "text",
            "index": false
          },
          "type" : {"type": "keyword"}
        }
      },
      "settings": {
        "analysis": {
          "analyzer": {
            "html_analyzer" : {
              "type" :"custom",
              "char_filter": [
                "html_strip"
              ],
              "tokenizer" : "standard",
              "filter" : [
                "lowercase" ,
                "asciifolding" ,
                "stop",
                "edge_ngram"
              ]
            }
          },
          "filter": {
            "edge_ngram" : {
              "type" : "edge_ngram",
              "min_gram": 3,
              "max_gram": 20
            }
          }
        }
      }
    }
- create an alias pointing to created above index
- Ingest the data
    - traverse the doc path until you reach an html file
    - TODO: extract heading (or title) and summary from html

- search the queries against the alias
        POST docs/_search
        {
          "query": {
            "match": {
              "content": {
                "query": "disc"
              }
            }
          }
          , "_source":  ["url", "version" , "type" , "summary"]
        }

'''

import os
import random
import sys
import string
import time
import yaml
import git
from argparse import ArgumentParser
from elasticsearch import Elasticsearch as OpenSearch, helpers
# from pathlib import Path


SEARCH_ENDPOINT = os.getenv('SEARCH_ENDPOINT')
SEARCH_USER = os.getenv('SEARCH_USER')
SEARCH_PASS = os.getenv('SEARCH_PASS')
INDEX_NAME_PREFIX = 'documentation_index'
INDEX_ALIAS = 'docs'
SECTION_SEPARATOR = '===================='


DUMMY_URL = 'this/is/a/dummy/url'
DUMMY_VERSION = '1.0.0'
DUMMY_SUMMARY = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt' \
                ' ut labore et dolore magna aliqua.'
TYPE = 'DOC'


def parse_args(argv):
  desc = 'Tool to ingest documentation to OpenSearch cluster for search functionality on opensearch.org'
  usage = '%(prog)s [options]'
  parser = ArgumentParser(description=desc, usage=usage)
  args = parser.parse_args(argv)
  validate_args(args)
  return args


def validate_args(args):
  # TODO: place holder
  pass


def remove_prefix(text, prefix):
  if text.startswith(prefix):
    return text[len(prefix):]
  return text


def remove_suffix(text, suffix):
  if len(suffix) > 0 and text.endswith(suffix):
    return text[:-len(suffix)]
  return text


def generate_random_n_digit_string(k=8):
  # k should be integer
  # k should be greater than 0
  s = ''.join(random.choices(string.ascii_lowercase + string.digits, k=k))
  return s


def create_index_name_from_prefix(prefix=INDEX_NAME_PREFIX):
  return '{}_{}'.format(prefix, generate_random_n_digit_string())


def index_mappings():
  mappings = {
    "properties": {
      "url": {"type": "text"},
      "content": {
        "type": "text",
        "analyzer": "html_analyzer",
        "search_analyzer": "standard"
      },
      "version": {"type": "keyword"},
      "summary": {
        "type": "text",
        "index": False
      },
      "type": {"type": "keyword"}
    }
  }

  return mappings


def index_settings():
  settings = {
    "analysis": {
      "analyzer": {
        "html_analyzer": {
          "type": "custom",
          "char_filter": [
            "html_strip"
          ],
          "tokenizer": "standard",
          "filter": [
            "lowercase",
            "asciifolding",
            "stop",
            "edge_ngram"
          ]
        }
      },
      "filter": {
        "edge_ngram": {
          "type": "edge_ngram",
          "min_gram": 3,
          "max_gram": 20
        }
      }
    }
  }
  return settings


def get_all_markdown_files_under_path(base_path, indexing_directories=[], **kwargs):
  # check if the directory exists
  markdown_files = []
  other_files = []

  for directory in indexing_directories:
    doc_path = os.path.normpath(os.path.join(base_path, directory))
    print(doc_path)
    for dirpath, dirnames, filenames in os.walk(doc_path):
      for f in filenames:
        if (f.endswith("md") or f.endswith("markdown")) and not f.startswith('_'):
          markdown_files.append(dirpath + os.sep + f)
        else:
          other_files.append(dirpath + os.sep + f)

  # print(SECTION_SEPARATOR)
  # print(markdown_files)
  # print(SECTION_SEPARATOR)
  return base_path, markdown_files


def get_all_html_files_under_path(folder_name='', path=os.getcwd()):
  # check if the directory exists
  doc_path = os.path.normpath(os.path.join(path, "..", folder_name))
  # print(doc_path)
  html_files = []
  other_files = []

  for dirpath, dirnames, filenames in os.walk(doc_path):
    for f in filenames:
      if (f.endswith("html") or f.endswith("htm")) and not f.startswith('_'):
        html_files.append(dirpath + os.sep + f)
      else:
        other_files.append(dirpath + os.sep + f)

  # print(html_files)
  return folder_name, doc_path, html_files


def get_data_from_text_file(f):
  data = []

  for line in open(f, encoding="utf-8", errors="ignore"):
    data.append(str(line))

  return "".join(data)


def yield_docs(all_files, doc_path, folder_name, index):

  url_prefix = remove_suffix(doc_path, folder_name)

  for _id, filename in enumerate(all_files):
    content = get_data_from_text_file(filename)

    doc_source = {
      "content": content,
      "type": TYPE,
      "summary": DUMMY_SUMMARY,
      "url": remove_prefix(remove_suffix(remove_suffix(filename, '.markdown'), '.md'), url_prefix).replace('_', ''),
      "version": DUMMY_VERSION
    }

    yield {
      "_index": index,
      "_source": doc_source
    }


def get_git_root(path):
  git_repo = git.Repo(path, search_parent_directories=True)
  git_root = git_repo.git.rev_parse("--show-toplevel")
  return git_root


def load_config():
  with open("config.yml", 'r') as stream:
    config = yaml.safe_load(stream)
  return config


def main(argv=None):
  '''
  - TODO: read the directory from command line argument or use default location
  - create new index with mappings and settings
  - go through all the directories and read all html files and index it into this index
  - point the alias to this new index
  '''
  args = parse_args(argv)

  config = load_config()
  print("indexing_directories: ", config.get("indexing_directories"))
  print(SECTION_SEPARATOR)

  os_client = OpenSearch([SEARCH_ENDPOINT], http_auth=(SEARCH_USER, SEARCH_PASS))

  # print("Listing all indices : ")
  # print(os_client.cat.indices())
  # return

  print("Creating a new index")
  new_index = create_index_name_from_prefix()
  status = os_client.indices.create(index=new_index,
                                    body={
                                      "settings": index_settings(),
                                      "mappings": index_mappings()
                                    })
  print("Created a new index: ", new_index)
  print(SECTION_SEPARATOR)

  print("Listing all indices : ")
  print(os_client.cat.indices())
  print(SECTION_SEPARATOR)

  git_root = get_git_root(os.getcwd())
  print("Documentation website root: ", git_root)

  base_path, all_markdown_files = get_all_markdown_files_under_path(git_root, config.get('indexing_directories'))
  print("Total {} markdown files found".format(len(all_markdown_files)))

  time.sleep(2)

  try:
    print("Starting bulk indexing to OpenSearch cluster..")
    os_response = helpers.bulk(os_client, yield_docs(all_markdown_files, base_path, '', new_index), chunk_size=5, request_timeout=20)
    print("\nhelpers.bulk() RESPONSE:", os_response)
    print(SECTION_SEPARATOR)
  except Exception as err:
    print("\nhelpers.bulk() ERROR:", err)
    print(SECTION_SEPARATOR)
    sys.exit(1)

  if os_client.indices.exists_alias(INDEX_ALIAS):
    print("Indices associated with alias '{}' exists ".format(INDEX_ALIAS))
    print(os_client.cat.aliases())
    print("Deleting existing alias associated with '{}'".format(INDEX_ALIAS))
    os_client.indices.delete_alias([INDEX_NAME_PREFIX + "*"], INDEX_ALIAS)
    print(os_client.cat.aliases())

  print("Updating alias {} to point to new index {}...".format(INDEX_ALIAS, new_index))
  os_client.indices.put_alias([new_index], INDEX_ALIAS)
  print(os_client.cat.aliases())


if __name__ == '__main__':
  sys.exit(main(sys.argv[1:]))
