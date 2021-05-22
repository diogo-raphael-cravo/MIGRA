FROM openjdk:8-alpine

RUN adduser --disabled-password user
USER user

ARG WORKDIR=/home/user
ARG TMPDIR=/tmp/aggtmp
COPY . $WORKDIR
WORKDIR $WORKDIR
RUN mkdir lib
RUN wget https://www.user.tu-berlin.de/o.runge/agg/down_V21_java8/aggEngine_V21.zip
RUN unzip aggEngine_V21.zip
RUN mv aggEngine_V21/aggEngine_V21_classes.jar lib/aggEngine-21.jar
RUN javac -classpath $WORKDIR/lib/aggEngine-21.jar $WORKDIR/src/main/java/Save.java $WORKDIR/src/main/java/Transform.java $WORKDIR/src/main/java/TransformLayered.java
ENV CLASSPATH=$WORKDIR/src/main/java:$WORKDIR/lib/aggEngine-21.jar

RUN mkdir $TMPDIR
ENV TMPDIR=$TMPDIR

CMD [ "sh", "-c", "echo /usr/bin/java -classpath $CLASSPATH $COMMAND $TMPDIR$SOURCE $TMPDIR$TARGET && /usr/bin/java -classpath $CLASSPATH $COMMAND $TMPDIR$SOURCE $TMPDIR$TARGET"]