#!/usr/bin/env python
import os
import io
import glob
import re
from setuptools import setup, find_packages

def read(*names, **kwargs):
    with io.open(os.path.join(os.path.dirname(__file__), *names),
                 encoding=kwargs.get("encoding", "utf8")) as fp:
        return fp.read()

def find_version(*file_paths):
    version_file = read(*file_paths)
    version_match = re.search(r"^__version__ = ['\"]([^'\"]*)['\"]",
                              version_file, re.M)
    if version_match:
        return version_match.group(1)
    raise RuntimeError("Unable to find version string.")

try:
    long_description = open('README.md').read()
except Exception:
    long_description = ''

VERSION = find_version('insightface', '__init__.py')

requirements = [
    'numpy',
    'onnx',
    'tqdm',
    'requests',
    'matplotlib',
    'Pillow',
    'scipy',
    'scikit-learn',
    'scikit-image',
    'easydict',
    'cython',
    'albumentations',
    'prettytable',
]

data_images = list(glob.glob('insightface/data/images/*.jpg'))
data_images += list(glob.glob('insightface/data/images/*.png'))
data_objects = list(glob.glob('insightface/data/objects/*.pkl'))
data_files = [
    ('insightface/data/images', data_images),
    ('insightface/data/objects', data_objects),
]

setup(
    name='insightface',
    version=VERSION,
    author='InsightFace Contributors',
    author_email='contact@insightface.ai',
    url='https://github.com/deepinsight/insightface',
    description='InsightFace Python Library',
    long_description=long_description,
    long_description_content_type='text/markdown',
    license='MIT',
    packages=find_packages(exclude=('docs', 'tests', 'scripts')),
    data_files=data_files,
    zip_safe=True,
    include_package_data=True,
    entry_points={"console_scripts": ["insightface-cli=insightface.commands.insightface_cli:main"]},
    install_requires=requirements,
    ext_modules=[],
)
