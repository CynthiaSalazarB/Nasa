function [AgeChr, GndChr, AgeHealthy, GndHealthy] = getAgeGender (fnameChrIns, fnameHealthy)

ISIPath = 'E:\T_Sleep\Sleep\MonashData\Deakin Requested Data_v1';
[ISIData,ISIInfo] = xlsread(ISIPath);
[tf, ~, ~] = intersect (fnameChrIns, fnameHealthy);
[AgeChr, GndChr, AgeHealthy, GndHealthy] = deal([]);

for i=1:numel(tf)
    tempId = str2double(tf{i});
    tempIdx = find(ISIData==tempId);
    actDOB = ISIInfo{tempIdx+1,3};
    actst = ISIInfo{tempIdx+1,4};
    age = abs(datenum(actst, 'dd/mm/yy') - datenum(actDOB, 'dd/mm/yy'))./(7*52);
    AgeChr = [AgeChr; age];
    GndChr = [GndChr; ISIData(tempIdx,2)];
    
    actDOB = ISIInfo{tempIdx+1,12};
    actst = ISIInfo{tempIdx+1,13};
    age = abs(datenum(actst, 'dd/mm/yy') - datenum(actDOB, 'dd/mm/yy'))./(7*52);
    AgeHealthy = [AgeHealthy; age];
    GndHealthy = [GndHealthy; ISIData(tempIdx,11)];
end
    