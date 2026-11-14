function [feaVal,feaName]=calculatePoincareParameters(rr,maxLag)

feaVal=[];
feaName={};
for lag=1:maxLag
    [CCM,SD1,SD2]=getPoincareParameterWithLag(rr,lag);
    feaVal=[feaVal SD1 SD2 SD1/SD2 CCM];
    feaName=[feaName ['SD1 Lag=' num2str(lag)] ['SD2 Lag=' num2str(lag)]...
        ['Ratio Lag=' num2str(lag)] ['CCM Lag=' num2str(lag)]];
    
    %[GI,PI,SI,EI]=getAsymmetryIndexes(rr,lag);
    %feaVal=[feaVal GI PI SI EI];
    %feaName=[feaName ['GI Lag=' num2str(lag)] ['PI Lag=' num2str(lag)]...
    %    ['SI Lag=' num2str(lag)] ['EI Lag=' num2str(lag)]];
end