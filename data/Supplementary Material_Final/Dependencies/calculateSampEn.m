function SampEn=calculateSampEn(data,m,r)

N=length(data);

flagOverlapping=1;

matrixM=createMatrix(data,m,flagOverlapping);
noVector=size(matrixM,1);
allMatchesM=[];
for i=1:noVector-1
    vector=matrixM(i,:);
    matInd=[1:i-1 i+1:noVector-1];
    noMatches=countMatches(matrixM(matInd,:),vector,r);
    allMatchesM=[allMatchesM;noMatches];
end
avgMatchesM=mean(allMatchesM);

matrixM1=createMatrix(data,m+1,flagOverlapping);
noVector=size(matrixM1,1);
allMatchesM1=[];
for i=1:noVector
    vector=matrixM1(i,:);
    matInd=[1:i-1 i+1:noVector];
    noMatches=countMatches(matrixM1(matInd,:),vector,r);
    allMatchesM1=[allMatchesM1;noMatches];
end
avgMatchesM1=mean(allMatchesM1);

SampEn=-log(avgMatchesM1/avgMatchesM);
