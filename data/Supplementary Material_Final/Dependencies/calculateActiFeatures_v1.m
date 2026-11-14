function [feaVals,feaNames]=calculateActiFeatures_v1(actiSig) 

minNoActLenForSOL=10;
minNoActLenForTST=3;
maxLag=1;
m=5;
k=0.2;
tau = 1;

feaVals=[];
feaNames={};

% removing islands of zeros and nonzeros from the signal

ind=find(actiSig==0);
dInd=diff(ind);

mAct=mean(actiSig(actiSig~=0));
sdAct=std(actiSig(actiSig~=0));
% RMSSDAct=sqrt(mean(diff(actiSig).^2));
% feaNames={'mean' 'sd' 'rmssd'};
% feaVals=[mAct sdAct RMSSDAct];
feaNames={'mean' 'sd'};
feaVals=[mAct sdAct];
[poinFea,feaName]=calculatePoincareParameters(actiSig,maxLag);
feaVals=[feaVals poinFea];
feaNames=[feaNames feaName];
nActiSig=zscore(actiSig);
SampEn=calculateSampEn(nActiSig,m,k);
feaVals=[feaVals SampEn];
feaNames=[feaNames 'SampEn'];

dSig=diff(actiSig);
dSig=[50000;dSig];
ind1=find(dSig<0 & actiSig==0);
ind2=find(dSig>0 & actiSig==dSig);
if actiSig(1)==0
    ind1=[1;ind1];
end
if length(ind2)<length(ind1)
    ind2=[ind2;length(actiSig)];
end
inactEventLen=ind2-ind1;
inactAboveThreshInd=find(inactEventLen>=minNoActLenForSOL);
if ~isempty(inactAboveThreshInd)
    sleepOnsetInd=inactAboveThreshInd(1);
    SOL=ind1(sleepOnsetInd);
 
    inactEventLenTST=inactEventLen(sleepOnsetInd:end);
    TST=sum(actiSig(SOL:end)==0);
    WASO=sum(actiSig(SOL:end)>0);
    SE=sum(actiSig(SOL:end)==0)/length(actiSig)*100;
    SWR=WASO/TST;%sleep wake ratio
else
    SOL=length(actiSig);
    TST=0;
    WASO=0;
    SE=0;
    SWR=0;
end

feaVals=[feaVals TST WASO SWR SOL SE];
feaNames=[feaNames 'TST' 'WASO' 'SWR' 'SL' 'SE'];


