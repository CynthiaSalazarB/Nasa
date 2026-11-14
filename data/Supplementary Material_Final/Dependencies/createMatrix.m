function dataMatrix=createMatrix(dataVector,noCol,flagOverlapping)

len=length(dataVector);
dataVector=reshape(dataVector,1,len);

if flagOverlapping==1
    sInd=1:len-noCol+1;
else
    sInd=1:noCol:len-noCol;
end
dataMatrix=[];
for i=1:length(sInd)
    dataMatrix=[dataMatrix;dataVector(sInd(i):sInd(i)+noCol-1)];
end

