FROM haskell:8
RUN  apt-get update \
  && apt-get install -y wget \
  && rm -rf /var/lib/apt/lists/*
RUN adduser --disabled-password user
USER user
RUN stack upgrade
ARG WORKDIR=/home/user
WORKDIR $WORKDIR
ARG VERIGRAPH_COMMIT=754ec08bf4a55ea7402d8cd0705e58b1d2c9cd67
RUN wget --output-document=$VERIGRAPH_COMMIT.tar.gz https://github.com/Verites/verigraph/tarball/$VERIGRAPH_COMMIT
RUN tar -xvzf $VERIGRAPH_COMMIT.tar.gz
RUN cd Verites*/ \
    && stack setup \
    && stack install
CMD [ "sh", "-c", "echo PATH=~/.local/bin:${PATH} verigraph $COMMAND && PATH=~/.local/bin:${PATH} verigraph $COMMAND"]