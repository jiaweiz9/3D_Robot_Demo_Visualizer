from setuptools import setup, find_packages

setup(
    name="3d-robot-demo-visualizer",
    version="1.0.0",
    packages=find_packages(),
    include_package_data=True,
    package_data={
        '3d_demo_vis': ['static/**/*', 'templates/**/*'],
    },
    install_requires=[
        "flask>=2.0.0",
        "numpy>=1.21.0",
        "zarr>=2.12.0",
        "h5py>=3.0.0",
        "transforms3d>=0.4.2",
    ],
    python_requires=">=3.8",
)